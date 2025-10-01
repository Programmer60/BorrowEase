import mongoose from 'mongoose';

// Lightweight in-memory + Mongo fallback hybrid limiter
// Strategy: maintain short-term (burst) counts in-memory per process, persist rolling window events in Mongo for durability & cross-instance coherence.

const burstCache = new Map(); // key -> { count, resetAt }
const BURST_WINDOW_MS = 15 * 1000; // 15s

const rateEventSchema = new mongoose.Schema({
  key: { type: String, index: true },
  type: { type: String, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});
rateEventSchema.index({ key:1, type:1, createdAt:1 });

export const RateEvent = mongoose.models.RateEvent || mongoose.model('RateEvent', rateEventSchema);

const WINDOWS = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000
};

// Default thresholds (can override via env)
const LIMITS = {
  submit_per_ip_minute: parseInt(process.env.RL_SUBMIT_PER_IP_MINUTE || '12', 10),
  submit_per_ip_hour: parseInt(process.env.RL_SUBMIT_PER_IP_HOUR || '60', 10),
  submit_per_email_hour: parseInt(process.env.RL_SUBMIT_PER_EMAIL_HOUR || '20', 10),
  submit_per_email_day: parseInt(process.env.RL_SUBMIT_PER_EMAIL_DAY || '60', 10),
  submit_per_fingerprint_hour: parseInt(process.env.RL_SUBMIT_PER_FP_HOUR || '25', 10)
};

function incrBurst(key) {
  const now = Date.now();
  let rec = burstCache.get(key);
  if (!rec || rec.resetAt < now) {
    rec = { count: 0, resetAt: now + BURST_WINDOW_MS };
  }
  rec.count += 1;
  burstCache.set(key, rec);
  return { count: rec.count, resetInMs: rec.resetAt - now };
}

export async function recordEvent(key, type) {
  await RateEvent.create({ key, type });
}

async function countWindow(key, type, windowMs) {
  const since = new Date(Date.now() - windowMs);
  return RateEvent.countDocuments({ key, type, createdAt: { $gte: since } });
}

export async function checkSubmitLimits({ ip, email, fingerprint }) {
  const reasons = [];
  const keyIp = `ip:${ip}`;
  const keyEmail = email ? `email:${email.toLowerCase()}` : null;
  const keyFp = fingerprint ? `fp:${fingerprint}` : null;

  // Burst control (in-memory) to stop floods immediately
  const burst = incrBurst(keyIp);
  if (burst.count > 5) {
    return { allowed: false, retryAfterSeconds: Math.ceil(burst.resetInMs / 1000), reason: 'burst_exceeded', action: 'retry_later' };
  }

  // Rolling window checks (Mongo)
  const [ipMin, ipHour, emailHour, emailDay, fpHour] = await Promise.all([
    countWindow(keyIp, 'submit', WINDOWS.minute),
    countWindow(keyIp, 'submit', WINDOWS.hour),
    keyEmail ? countWindow(keyEmail, 'submit', WINDOWS.hour) : Promise.resolve(0),
    keyEmail ? countWindow(keyEmail, 'submit', WINDOWS.day) : Promise.resolve(0),
    keyFp ? countWindow(keyFp, 'submit', WINDOWS.hour) : Promise.resolve(0)
  ]);

  if (ipMin >= LIMITS.submit_per_ip_minute) {
    return { allowed:false, reason:'ip_minute_limit', action:'retry_later', retryAfterSeconds:60 };
  }
  if (ipHour >= LIMITS.submit_per_ip_hour) {
    return { allowed:false, reason:'ip_hour_limit', action:'retry_later', retryAfterSeconds:3600 };
  }
  if (keyEmail) {
    if (emailHour >= LIMITS.submit_per_email_hour) {
      return { allowed:false, reason:'email_hour_limit', action:'retry_later', retryAfterSeconds:3600 };
    }
    if (emailDay >= LIMITS.submit_per_email_day) {
      return { allowed:false, reason:'email_day_limit', action:'retry_tomorrow', retryAfterSeconds:24*3600 };
    }
  }
  if (keyFp && fpHour >= LIMITS.submit_per_fingerprint_hour) {
    return { allowed:false, reason:'fingerprint_hour_limit', action:'retry_later', retryAfterSeconds:3600 };
  }

  // Record accepted event (async fire & forget but awaited here for ordering simplicity)
  await Promise.all([
    recordEvent(keyIp, 'submit'),
    keyEmail ? recordEvent(keyEmail, 'submit') : null,
    keyFp ? recordEvent(keyFp, 'submit') : null
  ].filter(Boolean));

  return { allowed:true, reason:'ok' };
}

export default { checkSubmitLimits };
