import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["payment", "loan", "admin", "loan_approved", "loan_rejected", "loan_flagged", "loan_unflagged", "loan_suspended", "kyc_verified", "kyc_rejected"], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
