import crypto from 'crypto';
import SuppressedEmail from '../models/suppressedEmailModel.js';
import ContactMessage from '../models/contactModel.js';

const MISDIRECT_SECRET = process.env.MISDIRECT_SECRET || 'dev-misdirect-secret';

function hmacToken(email, messageId) {
  return crypto
    .createHmac('sha256', MISDIRECT_SECRET)
    .update(`${email}|${messageId}`)
    .digest('hex');
}

export async function isSuppressed(email) {
  if (!email) return false;
  const found = await SuppressedEmail.findOne({ email: email.toLowerCase() }).lean();
  return !!found;
}

export async function suppressEmail(email, { reason, source='other', ttlHours, manual=false } = {}) {
  if (!email) return null;
  const update = { reason, source, manual };
  if (ttlHours) {
    update.expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
  }
  const existing = await SuppressedEmail.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.reason = reason || existing.reason;
    existing.source = source || existing.source;
    existing.manual = manual || existing.manual;
    if (update.expiresAt) existing.expiresAt = update.expiresAt;
    existing.hitCount = (existing.hitCount || 0) + 1;
    await existing.save();
    return existing;
  }
  return SuppressedEmail.create({ email: email.toLowerCase(), ...update });
}

export function generateMisdirectedLink(email, messageId) {
  const token = hmacToken(email.toLowerCase(), messageId);
  return `${process.env.PUBLIC_BASE_URL || 'https://example.com'}/contact/report-misdirected?m=${messageId}&e=${encodeURIComponent(email)}&t=${token}`;
}

export async function verifyAndSuppressMisdirected({ email, messageId, token }) {
  if (!email || !messageId || !token) {
    return { ok:false, status:400, message:'Missing parameters' };
  }
  const expected = hmacToken(email.toLowerCase(), messageId);
  if (expected !== token) {
    return { ok:false, status:401, message:'Invalid token' };
  }
  const message = await ContactMessage.findById(messageId);
  if (!message) {
    return { ok:false, status:404, message:'Message not found' };
  }
  if (message.email.toLowerCase() !== email.toLowerCase()) {
    return { ok:false, status:400, message:'Email mismatch' };
  }
  await suppressEmail(email, { reason: 'Recipient reports misdirected email', source:'misdirected', manual:false });
  return { ok:true, status:200, message:'Email suppressed. You will not receive further replies.' };
}

export default {
  isSuppressed,
  suppressEmail,
  generateMisdirectedLink,
  verifyAndSuppressMisdirected
};
