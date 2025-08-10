import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Added "dispute_resolved" to support notifying borrower/lender when admin resolves a dispute
  type: { 
    type: String, 
    enum: [
      "payment", 
      "loan", 
      "admin", 
      "loan_approved", 
      "loan_rejected", 
      "loan_flagged", 
      "loan_unflagged", 
      "loan_suspended", 
      "kyc_verified", 
  "kyc_rejected",
  "dispute_resolved",
  "dispute_opened"
    ], 
    required: true 
  },
  // Optional title for better display in UIs that support it
  title: { type: String },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
