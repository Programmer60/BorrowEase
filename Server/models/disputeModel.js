import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  raisedBy: {
  type: String, // App user ID (MongoDB ObjectId as string)
    required: true
  },
  role: {
    type: String,
    enum: ['borrower', 'lender'],
    required: true
  },
  category: {
    type: String,
    enum: ['payment', 'communication', 'fraud', 'technical', 'other'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxLength: 100
  },
  message: {
    type: String,
    required: true,
    maxLength: 1000
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expectedResolution: {
    type: String,
    maxLength: 500,
    default: ''
  },
  evidence: [
    {
      url: { type: String },
      name: { type: String },
      type: { type: String },
      size: { type: Number }
    }
  ],
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'rejected'],
    default: 'open'
  },
  adminResponse: {
    type: String,
    default: ''
  },
  adminId: {
  type: String // App user ID (MongoDB ObjectId as string)
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const Dispute = mongoose.model('Dispute', disputeSchema);

export default Dispute;
