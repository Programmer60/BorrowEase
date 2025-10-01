import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EmailJob } from '../models/emailJobModel.js';
import ContactMessage from '../models/contactModel.js';
import { sendEmail, EmailSendError } from '../services/emailService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/borrowease';
const WORKER_ID = `email-worker-${Math.random().toString(36).slice(2,8)}`;
const BATCH_SIZE = parseInt(process.env.EMAIL_WORKER_BATCH || '10', 10);
const VISIBILITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes lock

function computeBackoffMs(attempt) {
  // exponential with jitter: base 5s * 2^(attempt-1) capped at 10m
  const base = 5000 * Math.pow(2, Math.max(0, attempt - 1));
  const capped = Math.min(base, 10 * 60 * 1000);
  const jitter = Math.random() * 0.3 * capped; // up to 30% jitter
  return Math.round(capped + jitter);
}

async function acquireJobs() {
  // Eligible jobs: status queued, lock free/expired AND ready by nextAttemptAt (or unset)
  const now = new Date();
  const lockExpiry = new Date(Date.now() - VISIBILITY_TIMEOUT_MS);

  // NOTE: Original implementation had two $or keys so the first was overwritten by Mongo driver.
  // We fix this by combining with $and so BOTH readiness and lock conditions apply.
  const query = {
    status: 'queued',
    $and: [
      { $or: [ { lockedAt: null }, { lockedAt: { $lt: lockExpiry } } ] },
      { $or: [ { nextAttemptAt: null }, { nextAttemptAt: { $lte: now } } ] }
    ]
  };

  if (process.env.EMAIL_WORKER_DEBUG === 'true') {
    console.log(`[WORKER ${WORKER_ID}] Acquisition query`, JSON.stringify(query));
  }

  const jobs = await EmailJob.find(query)
    .sort({ priority: 1, queuedAt: 1 })
    .limit(BATCH_SIZE);

  if (process.env.EMAIL_WORKER_DEBUG === 'true') {
    console.log(`[WORKER ${WORKER_ID}] Found ${jobs.length} candidate job(s)`);
  }

  const locked = [];
  for (const job of jobs) {
    const updated = await EmailJob.findOneAndUpdate(
      { _id: job._id, status: 'queued' },
      { $set: { lockedAt: new Date(), lockedBy: WORKER_ID, status: 'sending' } },
      { new: true }
    );
    if (updated) locked.push(updated);
  }

  if (process.env.EMAIL_WORKER_DEBUG === 'true' && locked.length) {
    console.log(`[WORKER ${WORKER_ID}] Locked ${locked.length} job(s):`, locked.map(j => j._id.toString()).join(', '));
  }
  return locked;
}

async function processJob(job) {
  const attemptNo = job.attemptCount + 1;
  if (process.env.EMAIL_WORKER_DEBUG === 'true') {
    console.log(`[WORKER ${WORKER_ID}] Sending job ${job._id} attempt ${attemptNo}/${job.maxAttempts}`);
  }
  try {
    const result = await sendEmail({ to: job.to, subject: job.subject, body: job.body });
    job.status = 'sent';
    job.sentAt = new Date();
    job.lastTriedAt = new Date();
    job.attemptCount = attemptNo;
    job.provider = result.provider;
    job.providerMessageId = result.providerMessageId;
    await job.save();

    await ContactMessage.updateOne(
      { _id: job.messageId, 'responses.messages._id': job.responseId },
      { $set: {
        'responses.messages.$.emailDelivery.status': 'sent',
        'responses.messages.$.emailDelivery.sentAt': new Date(),
        'responses.messages.$.emailDelivery.provider': result.provider,
        'responses.messages.$.emailDelivery.providerMessageId': result.providerMessageId,
        'responses.messages.$.emailDelivery.attemptCount': attemptNo
      } }
    );

    console.log(`[WORKER ${WORKER_ID}] Sent email job ${job._id} to ${job.to}`);
  } catch (err) {
    job.attemptCount = attemptNo;
    job.lastTriedAt = new Date();
    job.lastError = err.message;
    const permanent = (err instanceof EmailSendError && err.permanent) || job.attemptCount >= job.maxAttempts;
    if (permanent) {
      job.status = 'permanent_failure';
    } else {
      job.status = 'queued';
      const backoff = computeBackoffMs(job.attemptCount);
      job.nextAttemptAt = new Date(Date.now() + backoff);
      if (process.env.EMAIL_WORKER_DEBUG === 'true') {
        console.warn(`[WORKER ${WORKER_ID}] Job ${job._id} failed (transient). Backoff ${backoff}ms. Error: ${err.message}`);
      }
    }
    await job.save();

    await ContactMessage.updateOne(
      { _id: job.messageId, 'responses.messages._id': job.responseId },
      { $set: {
        'responses.messages.$.emailDelivery.status': job.status === 'queued' ? 'failed' : job.status,
        'responses.messages.$.emailDelivery.errorMessage': err.message,
        'responses.messages.$.emailDelivery.attemptCount': job.attemptCount,
        'responses.messages.$.emailDelivery.lastTriedAt': new Date(),
        'responses.messages.$.emailDelivery.nextAttemptAt': job.nextAttemptAt
      } }
    );

    if (permanent) {
      console.error(`[WORKER ${WORKER_ID}] Job ${job._id} permanent failure: ${err.message}`);
    } else if (process.env.EMAIL_WORKER_DEBUG !== 'true') {
      // Already logged detailed info in debug mode
      console.error(`[WORKER ${WORKER_ID}] Job ${job._id} failed: ${err.message}`);
    }
  }
}

async function loop() {
  const jobs = await acquireJobs();
  if (!jobs.length) {
    if (process.env.EMAIL_WORKER_DEBUG === 'true') {
      console.log(`[WORKER ${WORKER_ID}] Idle cycle - no jobs ready`);
    }
    return; // idle cycle
  }
  await Promise.all(jobs.map(processJob));
}

async function main() {
  await mongoose.connect(MONGO_URI, { autoIndex: true });
  console.log(`[WORKER ${WORKER_ID}] Connected to MongoDB at ${MONGO_URI}`);
  if (process.env.EMAIL_WORKER_DEBUG === 'true') {
    console.log(`[WORKER ${WORKER_ID}] Debug logging enabled`);
  }
  const interval = parseInt(process.env.EMAIL_WORKER_INTERVAL_MS || '5000', 10); // default 5s
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    await loop();
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, interval));
  }
}

main().catch(err => {
  console.error('Email worker fatal error', err);
  process.exit(1);
});
