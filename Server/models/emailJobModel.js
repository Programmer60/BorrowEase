import mongoose from 'mongoose';

// Lightweight queue document for outbound emails (Option C architecture)
// Each admin response that isPublic=true creates one EmailJob. Worker processes jobs in FIFO order.
// We keep minimal denormalized info for faster worker operation without extra joins.

const emailJobSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactMessage', required: true, index: true },
  responseId: { type: mongoose.Schema.Types.ObjectId, required: true }, // subdocument _id inside responses.messages
  to: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  // Delivery lifecycle
  status: { type: String, enum: ['queued', 'sending', 'sent', 'failed', 'permanent_failure'], default: 'queued', index: true },
  attemptCount: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  nextAttemptAt: { type: Date },
  lastError: { type: String },
  provider: { type: String },
  providerMessageId: { type: String },
  queuedAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  lastTriedAt: { type: Date },
  // Simple dedupe / idempotency token (e.g. hash of to+subject+body)
  dedupeKey: { type: String, index: true },
  priority: { type: Number, default: 100 }, // lower is earlier; reserved for future SLA differentiation
  lockedAt: { type: Date },
  lockedBy: { type: String }
}, { timestamps: true });

emailJobSchema.index({ status: 1, priority: 1, queuedAt: 1 });
emailJobSchema.index({ nextAttemptAt: 1 });
emailJobSchema.index({ lockedAt: 1 }, { expireAfterSeconds: 3600 }); // auto-clean stale locks after 1h

export const EmailJob = mongoose.models.EmailJob || mongoose.model('EmailJob', emailJobSchema);
export default EmailJob;
