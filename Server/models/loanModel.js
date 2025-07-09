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
  createdAt: { type: Date, default: Date.now },
  repaid: { type: Boolean, default: false },
},{timestamps: true});


const Loan = mongoose.model("Loan", loanSchema);
export default Loan;
