import mongoose from 'mongoose';

const suppressedEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  reason: { type: String },
  source: { type: String, enum: ['misdirected','admin','bounce','abuse','other'], default: 'other' },
  suppressedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  manual: { type: Boolean, default: false },
  hitCount: { type: Number, default: 1 }
}, { timestamps: true });

suppressedEmailSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

export const SuppressedEmail = mongoose.models.SuppressedEmail || mongoose.model('SuppressedEmail', suppressedEmailSchema);
export default SuppressedEmail;
