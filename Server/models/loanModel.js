import mongoose from "mongoose";

const loanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeEmail: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  repaymentDate: { type: String, required: true },
  funded: { type: Boolean, default: false },
  lenderName: { type: String, default: "" },
  lenderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  repaid: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
},{timestamps: true});


const Loan = mongoose.model("Loan", loanSchema);
export default Loan;
