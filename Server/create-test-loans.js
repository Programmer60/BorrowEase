import mongoose from 'mongoose';
import Loan from './models/loanModel.js';
import User from './models/userModel.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createTestLoans = async () => {
  try {
    await connectDB();
    console.log('📊 Creating test loans...');

    // First, get a borrower from the database
    const borrowers = await User.find({ role: 'borrower' });
    console.log('Available borrowers:', borrowers.map(b => ({ id: b._id, name: b.name, email: b.email })));

    if (borrowers.length === 0) {
      console.log('❌ No borrowers found. Create a borrower first.');
      return;
    }

    const borrower = borrowers[0]; // Use first borrower

    // Create test loans
    const testLoans = [
      {
        name: borrower.name,
        collegeEmail: borrower.email,
        phoneNumber: borrower.phoneNumber || '9876543210',
        amount: 25000,
        purpose: 'Education - Books and supplies',
        repaymentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        borrowerId: borrower._id,
        status: 'approved',
        interestRate: 12,
        tenureMonths: 3,
        totalRepayable: 26000,
        emi: 8667,
        interestAmount: 1000,
        calculationMethod: 'compound',
        tier: 'standard',
        funded: false,
        repaid: false
      },
      {
        name: borrower.name,
        collegeEmail: borrower.email,
        phoneNumber: borrower.phoneNumber || '9876543210',
        amount: 15000,
        purpose: 'Emergency medical expenses',
        repaymentDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        borrowerId: borrower._id,
        status: 'approved',
        interestRate: 14,
        tenureMonths: 2,
        totalRepayable: 15700,
        emi: 7850,
        interestAmount: 700,
        calculationMethod: 'compound',
        tier: 'standard',
        funded: false,
        repaid: false
      },
      {
        name: borrower.name,
        collegeEmail: borrower.email,
        phoneNumber: borrower.phoneNumber || '9876543210',
        amount: 50000,
        purpose: 'Technology equipment for studies',
        repaymentDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
        borrowerId: borrower._id,
        status: 'approved',
        interestRate: 10,
        tenureMonths: 6,
        totalRepayable: 52500,
        emi: 8750,
        interestAmount: 2500,
        calculationMethod: 'compound',
        tier: 'premium',
        funded: false,
        repaid: false
      }
    ];

    // Delete existing test loans
    await Loan.deleteMany({ purpose: { $regex: /Education|Emergency|Technology/ } });

    // Create new test loans
    const createdLoans = await Loan.insertMany(testLoans);
    
    console.log('✅ Test loans created successfully:');
    createdLoans.forEach((loan, index) => {
      console.log(`${index + 1}. ${loan.purpose} - ₹${loan.amount} (ID: ${loan._id})`);
    });

    console.log('\n📊 Current loan statistics:');
    const totalLoans = await Loan.countDocuments();
    const approvedLoans = await Loan.countDocuments({ status: 'approved' });
    const fundedLoans = await Loan.countDocuments({ funded: true });
    
    console.log(`Total loans: ${totalLoans}`);
    console.log(`Approved loans: ${approvedLoans}`);
    console.log(`Funded loans: ${fundedLoans}`);

  } catch (error) {
    console.error('❌ Error creating test loans:', error);
  } finally {
    mongoose.connection.close();
  }
};

createTestLoans();
