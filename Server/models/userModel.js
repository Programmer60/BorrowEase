import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["borrower", "lender", "admin"], required: true },
  profilePicture: { type: String },
  trustScore: { type: Number, default: 50 }, // range 0 to 100
  loansRepaid: { type: Number, default: 0 },
  loansTaken: { type: Number, default: 0 },
  kycStatus: { 
    type: String, 
    enum: ["not_submitted", "pending", "verified", "rejected"], 
    default: "not_submitted" 
  },
  kyc: {
    dob: String,
    address: String,
    aadharUrl: String,
    panUrl: String,
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" }
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

export default mongoose.model("User", userSchema);