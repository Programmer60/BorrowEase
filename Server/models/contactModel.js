import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous submissions
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  // Whether the user proved ownership of the email (guest submissions start false)
  emailVerified: { type: Boolean, default: false, index: true },
  emailVerification: {
    codeHash: { type: String }, // hashed verification code
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date }
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },

  // Message Content
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'account', 'security', 'billing', 'feedback', 'complaint'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['very_low', 'low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // ENHANCED PRIORITY INTELLIGENCE FIELDS
  priorityScore: {
    type: Number,
    default: 0,
    min: -50,
    max: 200
  },
  priorityFactors: [{
    type: String,
    maxlength: [200, 'Priority factor cannot exceed 200 characters']
  }],
  priorityRecommendations: [{
    type: String,
    maxlength: [300, 'Priority recommendation cannot exceed 300 characters']
  }],
  userVerificationLevel: {
    type: String,
    enum: ['unverified', 'email_verified', 'phone_verified', 'kyc_pending', 'kyc_approved'],
    default: 'unverified'
  },
  customerTier: {
    type: String,
    enum: ['new', 'basic', 'verified', 'premium', 'vip'],
    default: 'new'
  },

  // Security & Tracking
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  fingerprint: {
    type: String, // Device fingerprint hash
    required: false
  },
  recaptchaScore: {
    type: Number,
    min: 0,
    max: 1,
    required: false
  },
  
  // Content Analysis
  sentiment: {
    score: { type: Number },
    label: { type: String, enum: ['positive', 'negative', 'neutral'] }
  },
  // Spam / Abuse Detection Scores
  //  - spamScoreRaw: additive unbounded raw score (legacy values may exceed 100)
  //  - spamScore: normalized score 0-1 (kept same field name for backward compatibility in UI)
  //  - spamScoreNormalized: alias for clarity (redundant but helps transitional queries)
  //  - classification: current label after automated pipeline
  spamScoreRaw: {
    type: Number,
    min: 0,
    default: 0,
    index: true
  },
  spamScore: { // normalized 0-1 representation used by UI (old field retained)
    type: Number,
    min: 0,
    max: 1,
    default: 0,
    index: true
  },
  spamScoreNormalized: { // duplicate for explicitness during migration
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  spamScoreVersion: { // allow future re‑calibration of normalization function
    type: Number,
    default: 1
  },
  classification: {
    type: String,
    enum: ['ham', 'suspected', 'spam'],
    default: 'ham',
    index: true
  },
  language: {
    type: String,
    default: 'en'
  },
  containsProfanity: {
    type: Boolean,
    default: false
  },
  containsLinks: {
    type: Boolean,
    default: false
  },
  linkCount: {
    type: Number,
    default: 0
  },
  // Content Quality Heuristics
  contentQuality: {
    score: { type: Number, min: 0, max: 100 },
    label: { type: String, enum: ['gibberish','low_quality','acceptable','excellent'], default: 'acceptable' },
    flags: [{ type: String }],
    metrics: {
      length: { type: Number },
      entropy: { type: Number },
      alphaRatio: { type: Number },
      vowelBalance: { type: Number },
      stopwordRatio: { type: Number },
      repeats: { type: Number },
      tokenCount: { type: Number },
      uniqueTokenCount: { type: Number }
    }
  },

  // Status & Processing
  status: {
    type: String,
    // Expanded to include all statuses used by admin routes; keep old ones for backward compatibility
    enum: ['pending', 'in_progress', 'reviewed', 'responded', 'resolved', 'closed', 'spam', 'blocked', 'quarantined'],
    default: 'pending'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  requiresReview: {
    type: Boolean,
    default: false
  },
  
  // Admin Processing
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  assignedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  reviewedAt: {
    type: Date
  },
  adminNotes: [{
    note: {
      type: String,
      maxlength: [1000, 'Admin note cannot exceed 1000 characters']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      // Expanded enum to reflect new operational note types used across services
      enum: ['status_change', 'general', 'escalation', 'bulk_action', 'auto_response', 'assignment'],
      default: 'general'
    }
  }],
  responses: {
    messages: [{
      message: {
        type: String,
        required: true
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      respondedAt: {
        type: Date,
        default: Date.now
      },
      isPublic: {
        type: Boolean,
        default: true
      },
      // Email delivery metadata (for queued outbound mail Option C)
      emailDelivery: {
        status: {
          type: String,
          enum: ['not_applicable', 'queued', 'sending', 'sent', 'failed', 'permanent_failure', 'skipped', 'awaiting_verification'],
          default: 'queued'
        },
        queuedAt: { type: Date },
        sentAt: { type: Date },
        lastTriedAt: { type: Date },
        nextAttemptAt: { type: Date },
        attemptCount: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 5 },
        provider: { type: String }, // e.g. 'smtp', 'sendgrid'
        providerMessageId: { type: String },
        errorMessage: { type: String },
        // For future advanced tracking (opens, clicks)
        tracking: {
          openTracked: { type: Boolean, default: false },
            openedAt: { type: Date }
        }
      }
    }],
    lastResponseAt: Date,
    responseCount: {
      type: Number,
      default: 0
    }
  },
  estimatedResponseTime: {
    type: Number, // in hours
    default: 24
  },

  // Auto Response Tracking (previously written ad-hoc without schema definition, now formalized)
  autoResponseSent: {
    type: Boolean,
    default: false
  },
  autoResponseMeta: {
    template: { type: String },
    confidence: { type: Number, min: 0, max: 100 },
    respondedAt: { type: Date }
  },

  // Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web'
  },
  referrer: String,
  sessionId: String,
  
  // Rate Limiting Data
  submissionCount: {
    type: Number,
    default: 1
  },
  lastSubmissionAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Normalization utility – can be evolved / versioned
function normalizeRawSpamScore(raw) {
  if (!raw || raw <= 0) return 0;
  // Cap extreme outliers using logarithmic compression to map large raw values into 0-1 range
  // Example: raw 50 -> ~0.83, raw 80 -> ~0.90, raw 200 -> ~0.96, raw 500 -> ~0.98, raw 1000 -> ~0.99
  const compressed = Math.log10(1 + raw) / Math.log10(1001); // denominator sets asymptote reference
  return Math.min(1, Number(compressed.toFixed(4)));
}

// Pre-save hook to keep normalized fields in sync when raw present but normalized absent or outdated
contactMessageSchema.pre('save', function(next) {
  if (this.isModified('spamScoreRaw') || this.isModified('spamScore') || this.isNew) {
    if (this.spamScoreRaw && (!this.spamScore || this.spamScore === 0 || this.isModified('spamScoreRaw'))) {
      const normalized = normalizeRawSpamScore(this.spamScoreRaw);
      this.spamScore = normalized;
      this.spamScoreNormalized = normalized;
    }
    // Derive classification thresholds
    if (this.spamScore >= 0.8) this.classification = 'spam';
    else if (this.spamScore >= 0.4) this.classification = 'suspected';
    else this.classification = 'ham';
  }
  next();
});

// Indexes for performance
contactMessageSchema.index({ email: 1, createdAt: -1 });
contactMessageSchema.index({ ipAddress: 1, createdAt: -1 });
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ spamScore: -1 });
contactMessageSchema.index({ requiresReview: 1, status: 1 });
contactMessageSchema.index({ userId: 1, createdAt: -1 });

// Virtual for time since submission
contactMessageSchema.virtual('timeSinceSubmission').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Method to check if message needs review
contactMessageSchema.methods.needsReview = function() {
  // Use normalized score thresholds now
  return this.spamScore >= 0.4 ||
         this.containsProfanity ||
         this.linkCount > 2 ||
         (typeof this.recaptchaScore === 'number' && this.recaptchaScore < 0.5) ||
         this.sentiment?.label === 'negative';
};

// Static utility to backfill normalization for existing documents
contactMessageSchema.statics.recalculateNormalizedSpamScores = async function(batchSize = 1000) {
  const cursor = this.find({ $or: [ { spamScoreRaw: { $exists: true } }, { spamScore: { $gt: 1 } } ] }).cursor();
  let processed = 0;
  const bulk = [];
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const raw = doc.spamScoreRaw || doc.spamScore; // legacy spamScore might hold raw value >1
    const normalized = normalizeRawSpamScore(raw);
    const classification = normalized >= 0.8 ? 'spam' : normalized >= 0.4 ? 'suspected' : 'ham';
    bulk.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            spamScoreRaw: raw,
            spamScore: normalized,
            spamScoreNormalized: normalized,
            spamScoreVersion: 1,
            classification,
            requiresReview: classification !== 'ham'
          }
        }
      }
    });
    processed++;
    if (bulk.length === batchSize) {
      await this.bulkWrite(bulk);
      bulk.length = 0;
    }
  }
  if (bulk.length) await this.bulkWrite(bulk);
  return { processed };
};

// Static method to get spam statistics
contactMessageSchema.statics.getSpamStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        spamMessages: { $sum: { $cond: [{ $eq: ['$classification', 'spam'] }, 1, 0] } },
        suspectedMessages: { $sum: { $cond: [{ $eq: ['$classification', 'suspected'] }, 1, 0] } },
        reviewQueue: { $sum: { $cond: ['$requiresReview', 1, 0] } },
        avgNormalizedSpam: { $avg: '$spamScore' },
        maxRawSpam: { $max: '$spamScoreRaw' }
      }
    },
    {
      $project: {
        _id: 0,
        totalMessages: 1,
        spamMessages: 1,
        suspectedMessages: 1,
        reviewQueue: 1,
        avgNormalizedSpam: 1,
        maxRawSpam: 1,
        spamRatePercent: {
          $multiply: [
            { $cond: [ { $eq: ['$totalMessages', 0] }, 0, { $divide: ['$spamMessages', '$totalMessages'] } ] },
            100
          ]
        }
      }
    }
  ]);
};

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
// Lightweight log model for FAQ auto-resolutions (no full ticket created)
const faqAutoResolveSchema = new mongoose.Schema({
  question: { type: String, required: true },
  category: { type: String },
  keywordsMatched: [String],
  userEmail: { type: String },
  userIp: { type: String },
  fingerprint: { type: String },
  createdAt: { type: Date, default: Date.now },
  // Whether user later chose to escalate after seeing FAQ (updated via patch)
  escalated: { type: Boolean, default: false }
}, { timestamps: true });

faqAutoResolveSchema.index({ createdAt: -1 });
faqAutoResolveSchema.index({ userEmail: 1, createdAt: -1 });

export const FaqAutoResolveLog = mongoose.models.FaqAutoResolveLog || mongoose.model('FaqAutoResolveLog', faqAutoResolveSchema);
export default ContactMessage;
