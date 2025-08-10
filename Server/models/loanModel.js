import mongoose from "mongoose";

const loanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeEmail: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  repaymentDate: { type: String, required: true },
  funded: { type: Boolean, default: false },
  fundedAt: { type: Date },
  lenderName: { type: String, default: "" },
  lenderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  repaid: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending",
  },
  // Moderation fields
  flagged: { type: Boolean, default: false },
  flagReason: { type: String },
  suspended: { type: Boolean, default: false },
  suspendReason: { type: String },
  // Enhanced Interest Calculation Fields
  interestRate: { type: Number }, // % per annum for percentage-based loans
  tenureMonths: { type: Number, required: true }, // Tenure in months
  totalRepayable: { type: Number }, // Principal + Interest
  emi: { type: Number }, // Monthly installment amount
  interestAmount: { type: Number }, // Total interest amount
  calculationMethod: { 
    type: String, 
    enum: ["flat_fee", "percentage"],
    default: "percentage"
  },
  tier: {
    minAmount: { type: Number },
    maxAmount: { type: Number },
    type: { type: String },
    flatFee: { type: Number },
    effectiveRate: { type: Number }
  },
  breakdown: {
    principal: {
      amount: { type: Number },
      percentage: { type: Number }
    },
    interest: {
      amount: { type: Number },
      percentage: { type: Number }
    },
    monthlyPayment: { type: Number },
    effectiveRate: { type: Number },
    totalCost: { type: Number }
  }
},{timestamps: true});


const Loan = mongoose.model("Loan", loanSchema);
export default Loan;
