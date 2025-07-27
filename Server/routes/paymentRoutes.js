import express from "express";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import crypto from "crypto";
import Loan from "../models/loanModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

// Load environment variables first
dotenv.config();

const router = express.Router();

// Initialize Razorpay with environment variables
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_pBgIF99r7ZIsb7",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "OpkPKasxawRNSCPHCBY1u66J",
});

router.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  try {
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: "INR",
      receipt: `rcptid_${Math.floor(Math.random() * 10000)}`,
    };

    const order = await instance.orders.create(options);
    console.log("Order created:", order);
    res.json(order);
  } catch (err) {
    console.error("Error in Razorpay order creation:", err);
    res.status(500).json({ error: "Razorpay order creation failed" });
  }
});

// Add this route to verify payments
router.post("/verify", verifyToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, loanId, isRepayment } = req.body;
  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (!loanId) {
      return res.status(400).json({ error: "Loan ID is required" });
    }

    // Get the loan with populated user data
    const loan = await Loan.findById(loanId).populate('borrowerId lenderId');
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    let update = {};
    let borrowerMessage = "";
    let lenderMessage = "";

    if (isRepayment === true || isRepayment === "true") {
      update = { repaid: true };
      borrowerMessage = `You have successfully repaid ₹${loan.amount} for your loan (${loan.purpose})`;
      lenderMessage = `Loan repayment of ₹${loan.amount} received from ${loan.name} for ${loan.purpose}`;
    } else {
      update = { funded: true, lenderId: req.user.id };
      borrowerMessage = `Your loan request for ₹${loan.amount} (${loan.purpose}) has been funded!`;
      lenderMessage = `You have successfully funded ₹${loan.amount} to ${loan.name} for ${loan.purpose}`;
    }

    const updatedLoan = await Loan.findByIdAndUpdate(loanId, update, { new: true });

    // Create notifications for both parties
    const notifications = [];

    if (isRepayment === true || isRepayment === "true") {
      // For repayment: notify both borrower and lender
      notifications.push(
        Notification.create({
          userId: loan.borrowerId,
          type: "payment",
          message: borrowerMessage,
        }),
        Notification.create({
          userId: loan.lenderId,
          type: "payment", 
          message: lenderMessage,
        })
      );
    } else {
      // For funding: notify borrower and the person who funded (lender)
      notifications.push(
        Notification.create({
          userId: loan.borrowerId,
          type: "payment",
          message: borrowerMessage,
        }),
        Notification.create({
          userId: req.user.id,
          type: "payment",
          message: lenderMessage,
        })
      );
    }

    await Promise.all(notifications);

    res.json({ status: "success", loan: updatedLoan });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

console.log("KEY_ID:", process.env.RAZORPAY_KEY_ID);
console.log("KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET);


export default router;
