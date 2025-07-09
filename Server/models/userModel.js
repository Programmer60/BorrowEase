import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["borrower", "lender"], required: true },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
