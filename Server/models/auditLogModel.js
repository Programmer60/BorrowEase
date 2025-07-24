import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  adminEmail: { 
    type: String, 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    enum: ['ROLE_CHANGE', 'USER_DELETE', 'USER_CREATE', 'LOAN_ACTION', 'SYSTEM_CONFIG']
  },
  targetUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  targetUserEmail: { 
    type: String 
  },
  details: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    additionalInfo: String
  },
  ipAddress: String,
  userAgent: String,
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Index for efficient querying
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetUserId: 1, timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
