import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["borrower", "lender"], required: true },
  profilePicture: { type: String }, // <-- Add this line
}, { timestamps: true });

export default mongoose.model("User", userSchema);