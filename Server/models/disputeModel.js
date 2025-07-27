import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema({
  loanId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Loan", 
    required: true 
  },
  raisedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  role: { 
    type: String, 
    enum: ["borrower", "lender"], 
    required: true 
  },
  category: {
    type: String,
    enum: ["payment", "communication", "fraud", "technical", "other"],
    required: true,
    default: "other"
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 1000
  },
  status: { 
    type: String, 
    enum: ["open", "in-progress", "resolved", "rejected"], 
    default: "open" 
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  adminResponse: {
    type: String,
    maxlength: 1000
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  resolvedAt: Date
}, { 
  timestamps: true 
});

export default mongoose.model("Dispute", disputeSchema);
