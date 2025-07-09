import express from "express";
import Loan from "../models/loanModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// router.post("/",verifyToken, async (req, res) => {
//   try {
//     const { name, collegeEmail, phoneNumber, amount, purpose, repaymentDate } = req.body;

//     // Simple check to only allow college emails (e.g., nituk.ac.in)
//     // if (!collegeEmail.endsWith(".ac.in")) {
//     //   return res.status(400).json({ error: "College email must end with .ac.in" });
//     // }

//     const newLoan = new Loan({ name, collegeEmail, phoneNumber, amount, purpose, repaymentDate });
//     await newLoan.save();

//     res.status(201).json(newLoan);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.post("/", verifyToken, async (req, res) => {
  try {
    const { phoneNumber, amount, purpose, repaymentDate } = req.body;

    // Extract user info from Firebase Auth Token
    const { name, email } = req.user;

    const newLoan = new Loan({
      name,
      collegeEmail: email,
      phoneNumber,
      amount,
      purpose,
      repaymentDate
    });

    await newLoan.save();
    res.status(201).json(newLoan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/", verifyToken, async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all loans for a specific user
router.get("/user", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const loans = await Loan.find({ collegeEmail: email });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all loans for a specific user (borrower)
router.get("/loan", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const loans = await Loan.find({ collegeEmail: email });
    if (loans.length === 0) {
      return res.status(404).json({ error: "No loans found for this user" });
    }
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lender funds a loan to verifyToken
router.patch("/:id/fund", verifyToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.funded = true;
    loan.lenderName = req.user.name || "Anonymous";
    await loan.save();

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Borrower marks loan as repaid
router.patch("/:id/repay", verifyToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    // Only borrower can mark their loan as repaid
    if (loan.collegeEmail !== req.user.email) {
      return res.status(403).json({ error: "You are not allowed to update this loan" });
    }

    loan.repaid = true;
    await loan.save();

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Borrower: Get my loans
router.get("/my-loans", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const loans = await Loan.find({ collegeEmail: email });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lender: Get all loans funded by this lender
router.get("/funded", verifyToken, async (req, res) => {
  try {
    const { name } = req.user;
    const loans = await Loan.find({ lenderName: name });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
// This is a basic route setup for the loan feature.
// Token verification is done using Firebase Auth.
// Token helps ensure that only authenticated users can create or fund loans.
// Axios vs Token: Axios is used for making HTTP requests, while the token is used for authentication.
// The token is sent in the request headers to verify the user's identity.