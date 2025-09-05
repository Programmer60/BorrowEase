import mongoose from 'mongoose';

const blacklistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ip', 'email', 'domain', 'keyword', 'fingerprint'],
    required: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    enum: ['spam', 'abuse', 'fraud', 'violation', 'manual'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Auto-detection data
  detectedBy: {
    type: String,
    enum: ['system', 'admin', 'ml-model', 'user-report'],
    default: 'system'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  
  // Admin management
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  
  // Statistics
  hitCount: {
    type: Number,
    default: 0
  },
  lastHit: Date,
  
  // Related data
  relatedMessages: [{
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContactMessage'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
blacklistSchema.index({ type: 1, value: 1 }, { unique: true });
blacklistSchema.index({ isActive: 1, expiresAt: 1 });
blacklistSchema.index({ type: 1, isActive: 1 });

// TTL index for automatic expiration
blacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
blacklistSchema.methods.hit = function() {
  this.hitCount += 1;
  this.lastHit = new Date();
  return this.save();
};

blacklistSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Static methods
blacklistSchema.statics.checkValue = function(type, value) {
  return this.findOne({
    type,
    value: { $regex: new RegExp(value, 'i') },
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

blacklistSchema.statics.checkEmail = function(email) {
  const domain = email.split('@')[1];
  return this.find({
    type: { $in: ['email', 'domain'] },
    $or: [
      { value: email.toLowerCase() },
      { value: domain.toLowerCase() }
    ],
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

blacklistSchema.statics.checkContent = function(content) {
  return this.find({
    type: 'keyword',
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).then(keywords => {
    const lowerContent = content.toLowerCase();
    return keywords.filter(keyword => 
      lowerContent.includes(keyword.value.toLowerCase())
    );
  });
};

const Blacklist = mongoose.model('Blacklist', blacklistSchema);
export default Blacklist;
