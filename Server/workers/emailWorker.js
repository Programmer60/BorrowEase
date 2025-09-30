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
  // Eligible jobs: status queued, not locked or lock expired, and either no nextAttemptAt or time passed
  const now = new Date();
  const jobs = await EmailJob.find({
    status: 'queued',
    $or: [ { lockedAt: null }, { lockedAt: { $lt: new Date(Date.now() - VISIBILITY_TIMEOUT_MS) } } ],
    $or: [ { nextAttemptAt: null }, { nextAttemptAt: { $lte: now } } ]
  })
    .sort({ priority: 1, queuedAt: 1 })
    .limit(BATCH_SIZE);

  const locked = [];
  for (const job of jobs) {
    const updated = await EmailJob.findOneAndUpdate(
      { _id: job._id, status: 'queued' },
      { $set: { lockedAt: new Date(), lockedBy: WORKER_ID, status: 'sending' } },
      { new: true }
    );
    if (updated) locked.push(updated);
  }
  return locked;
}

async function processJob(job) {
  try {
    const result = await sendEmail({ to: job.to, subject: job.subject, body: job.body });
    job.status = 'sent';
    job.sentAt = new Date();
    job.lastTriedAt = new Date();
    job.attemptCount += 1;
    job.provider = result.provider;
    job.providerMessageId = result.providerMessageId;
    await job.save();

    // Update ContactMessage subdocument delivery status
    await ContactMessage.updateOne(
      { _id: job.messageId, 'responses.messages._id': job.responseId },
      { $set: { 'responses.messages.$.emailDelivery.status': 'sent', 'responses.messages.$.emailDelivery.sentAt': new Date(), 'responses.messages.$.emailDelivery.provider': result.provider, 'responses.messages.$.emailDelivery.providerMessageId': result.providerMessageId } }
    );

    console.log(`[WORKER ${WORKER_ID}] Sent email job ${job._id} to ${job.to}`);
  } catch (err) {
    job.attemptCount += 1;
    job.lastTriedAt = new Date();
    job.lastError = err.message;
    const permanent = (err instanceof EmailSendError && err.permanent) || job.attemptCount >= job.maxAttempts;
    if (permanent) {
      job.status = 'permanent_failure';
    } else {
      job.status = 'queued';
      job.nextAttemptAt = new Date(Date.now() + computeBackoffMs(job.attemptCount));
    }
    await job.save();

    await ContactMessage.updateOne(
      { _id: job.messageId, 'responses.messages._id': job.responseId },
      { $set: { 'responses.messages.$.emailDelivery.status': job.status === 'queued' ? 'failed' : job.status, 'responses.messages.$.emailDelivery.errorMessage': err.message, 'responses.messages.$.emailDelivery.attemptCount': job.attemptCount, 'responses.messages.$.emailDelivery.lastTriedAt': new Date(), 'responses.messages.$.emailDelivery.nextAttemptAt': job.nextAttemptAt } }
    );

    console.error(`[WORKER ${WORKER_ID}] Failed job ${job._id}: ${err.message}`);
  }
}

async function loop() {
  const jobs = await acquireJobs();
  if (!jobs.length) {
    return; // idle cycle
  }
  await Promise.all(jobs.map(processJob));
}

async function main() {
  await mongoose.connect(MONGO_URI, { autoIndex: true });
  console.log(`[WORKER ${WORKER_ID}] Connected to MongoDB at ${MONGO_URI}`);
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
