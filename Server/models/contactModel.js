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
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
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
  spamScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
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

  // Status & Processing
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'responded', 'resolved', 'spam', 'blocked'],
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
  reviewedAt: {
    type: Date
  },
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  response: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date,
    method: {
      type: String,
      enum: ['email', 'phone', 'internal'],
      default: 'email'
    }
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
  return this.spamScore > 30 || 
         this.containsProfanity || 
         this.linkCount > 2 || 
         this.recaptchaScore < 0.5 ||
         this.sentiment?.label === 'negative';
};

// Static method to get spam statistics
contactMessageSchema.statics.getSpamStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        spamMessages: {
          $sum: { $cond: [{ $gt: ['$spamScore', 50] }, 1, 0] }
        },
        avgSpamScore: { $avg: '$spamScore' },
        pendingReview: {
          $sum: { $cond: [{ $eq: ['$requiresReview', true] }, 1, 0] }
        }
      }
    }
  ]);
};

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
