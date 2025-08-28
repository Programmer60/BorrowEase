import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  firebaseUids: [{ type: String }], // Array to support multiple login methods (Google, Email/Password)
  role: { type: String, enum: ["borrower", "lender", "admin"], required: true },
  verified: { type: Boolean, default: false }, // Email verification status for industry compliance
  profilePicture: { type: String },
  trustScore: { type: Number, default: 50 }, // range 0 to 100
  loansRepaid: { type: Number, default: 0 },
  loansTaken: { type: Number, default: 0 },
  creditScore: { type: Number, default: 750 }, // Credit score field
  phone: { type: String }, // Phone number field
  location: { type: String }, // Location field
  bio: { type: String }, // Bio field
  university: { type: String }, // University field (for borrowers)
  graduationYear: { type: String }, // Graduation year field (for borrowers)
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
  lastLogin: { type: Date },
  loginMethods: [{ 
    type: String, 
    enum: ["google", "email", "phone"], 
    default: [] 
  }] // Track which methods user has used to login
}, { timestamps: true });

export default mongoose.model("User", userSchema);