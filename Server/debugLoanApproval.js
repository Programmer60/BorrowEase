// Debug script for testing admin loan approval/rejection
// Run with: node debugLoanApproval.js

import mongoose from 'mongoose';
import Loan from './models/loanModel.js';
import User from './models/userModel.js';

async function debugLoanApproval() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/BorrowEase');
    console.log('Connected to MongoDB');

    // Check if there are any loans
    const loans = await Loan.find().populate('borrowerId', 'name email');
    console.log('\n📋 All Loans:');
    loans.forEach(loan => {
      console.log(`ID: ${loan._id}, Status: ${loan.status}, Amount: ₹${loan.amount}, Borrower: ${loan.name}`);
    });

    // Check if there are any admin users
    const admins = await User.find({ role: 'admin' });
    console.log('\n👑 Admin Users:');
    admins.forEach(admin => {
      console.log(`Name: ${admin.name}, Email: ${admin.email}, Role: ${admin.role}`);
    });

    // Check if there are pending loans
    const pendingLoans = await Loan.find({ status: 'pending' });
    console.log(`\n⏳ Pending Loans: ${pendingLoans.length}`);
    pendingLoans.forEach(loan => {
      console.log(`  - ID: ${loan._id}, Amount: ₹${loan.amount}, Borrower: ${loan.name}`);
    });

    // Check loan status distribution
    const statusStats = await Loan.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('\n📊 Loan Status Distribution:');
    statusStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });

    // Test loan status update if we have pending loans
    if (pendingLoans.length > 0) {
      const testLoan = pendingLoans[0];
      console.log(`\n🧪 Testing approval for loan ID: ${testLoan._id}`);
      
      // Update loan status
      const updatedLoan = await Loan.findByIdAndUpdate(
        testLoan._id,
        { status: 'approved' },
        { new: true }
      );
      
      console.log(`✅ Loan status updated to: ${updatedLoan.status}`);
      
      // Revert back to pending for testing
      await Loan.findByIdAndUpdate(testLoan._id, { status: 'pending' });
      console.log(`🔄 Reverted loan status back to pending`);
    } else {
      console.log('\n⚠️ No pending loans available for testing');
    }

    mongoose.disconnect();
    console.log('\n✅ Debug complete');

  } catch (error) {
    console.error('❌ Debug error:', error);
    mongoose.disconnect();
  }
}

debugLoanApproval();
