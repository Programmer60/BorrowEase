import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

// Provider abstraction: smtp | sendgrid | ses (smtp is default now)
export async function sendEmail({ to, subject, body }) {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  switch (provider) {
    case 'smtp':
      return sendViaSmtp({ to, subject, body });
    case 'sendgrid':
      return sendViaSendGrid({ to, subject, body });
    case 'ses':
      return sendViaSes({ to, subject, body });
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
}

let smtpTransporterPromise;
async function getSmtpTransporter() {
  if (smtpTransporterPromise) return smtpTransporterPromise;
  if (process.env.SMTP_HOST) {
    smtpTransporterPromise = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  } else {
    const ethereal = await nodemailer.createTestAccount();
    smtpTransporterPromise = nodemailer.createTransport({
      host: ethereal.smtp.host,
      port: ethereal.smtp.port,
      secure: ethereal.smtp.secure,
      auth: { user: ethereal.user, pass: ethereal.pass }
    });
  }
  return smtpTransporterPromise;
}

async function sendViaSmtp({ to, subject, body }) {
  const transporter = await getSmtpTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || 'no-reply@example.com';
  const info = await transporter.sendMail({ from, to, subject, text: body });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { provider: process.env.SMTP_HOST ? 'smtp' : 'ethereal', providerMessageId: info.messageId, previewUrl };
}

// Placeholder implementations for future providers
// Custom error to indicate permanent failure (do not retry)
export class EmailSendError extends Error {
  constructor(message, { permanent = false, cause } = {}) {
    super(message);
    this.name = 'EmailSendError';
    this.permanent = permanent;
    if (cause) this.cause = cause;
  }
}

function classifySendGridError(err) {
  // Default: transient
  let permanent = false;
  // SendGrid library surfaces response errors at err.response
  const status = err?.code || err?.response?.statusCode;
  if (status) {
    if ([400, 401, 403, 404, 413].includes(status)) permanent = true; // config/content/auth issues
    if (status === 429) permanent = false; // rate limit -> retry
    if (status >= 500) permanent = false; // server transient
  }
  // If missing API key entirely
  if (!process.env.SENDGRID_API_KEY) permanent = true;
  return permanent;
}

let sendGridInitialized = false;
function initSendGrid() {
  if (sendGridInitialized) return;
  if (!process.env.SENDGRID_API_KEY) throw new EmailSendError('Missing SENDGRID_API_KEY', { permanent: true });
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sendGridInitialized = true;
}

async function sendViaSendGrid({ to, subject, body }) {
  initSendGrid();
  const from = process.env.MAIL_FROM || process.env.SENDGRID_FROM || 'no-reply@example.com';
  try {
    const [resp] = await sgMail.send({ to, from, subject, text: body });
    const providerMessageId = resp?.headers?.['x-message-id'] || resp?.headers?.['x-message-id'] || undefined;
    return { provider: 'sendgrid', providerMessageId };
  } catch (err) {
    const permanent = classifySendGridError(err);
    // Optional immediate SMTP fallback for transient errors
    if (!permanent && process.env.SMTP_HOST && process.env.SENDGRID_SMTP_FALLBACK === 'true') {
      try {
        const fallback = await sendViaSmtp({ to, subject, body });
        return { ...fallback, provider: 'sendgrid_smtp_fallback' };
      } catch (fallbackErr) {
        throw new EmailSendError(`SendGrid + SMTP fallback failed: ${fallbackErr.message}`, { permanent: false, cause: fallbackErr });
      }
    }
    throw new EmailSendError(`SendGrid send failed: ${err.message}`, { permanent, cause: err });
  }
}
async function sendViaSes({ to, subject, body }) {
  throw new Error('SES provider not yet implemented');
}

export default { sendEmail };
