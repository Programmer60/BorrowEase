import mongoose from "mongoose";

const kycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  personalInfo: {
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    occupation: { type: String, required: true },
    monthlyIncome: { type: Number, required: true },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    }
  },
  documents: {
    aadhar: {
      number: { type: String, required: true },
      frontImage: { type: String, required: true },
      backImage: { type: String, required: true }
    },
    pan: {
      number: { type: String, required: true },
      image: { type: String, required: true }
    },
    selfie: { type: String, required: true },
    addressProof: {
      type: String, // utility bill, bank statement, etc.
      image: String
    },
    incomeProof: {
      type: String, // salary slip, bank statement, etc.
      image: String
    }
  },
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending"
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String // Admin name who reviewed
  },
  comments: [{
    comment: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now }
  }],
  rejectionReason: {
    type: String
  },
  verificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
kycSchema.index({ userId: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ submittedAt: -1 });

const KYC = mongoose.model("KYC", kycSchema);
export default KYC;
