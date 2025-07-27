import mongoose from 'mongoose';
import Loan from './models/loanModel.js';

// Database connection
mongoose.connect('mongodb://localhost:27017/borrowease', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugLoans() {
  try {
    console.log('🔍 Debugging loans in database...\n');
    
    // Get all loans
    const allLoans = await Loan.find({}).select('_id name collegeEmail amount status purpose submittedAt');
    console.log(`📊 Total loans in database: ${allLoans.length}`);
    
    if (allLoans.length === 0) {
      console.log('❌ No loans found in database!');
      return;
    }
    
    console.log('\n💳 All loans:');
    allLoans.forEach((loan, index) => {
      console.log(`${index + 1}. ${loan.name} (${loan.collegeEmail}) - Amount: ₹${loan.amount} - Status: ${loan.status} - Purpose: ${loan.purpose}`);
    });
    
    // Count by status
    const pendingLoans = await Loan.find({ status: 'pending' });
    const approvedLoans = await Loan.find({ status: 'approved' });
    const rejectedLoans = await Loan.find({ status: 'rejected' });
    
    console.log('\n📈 Loan status distribution:');
    console.log(`⏳ Pending: ${pendingLoans.length}`);
    console.log(`✅ Approved: ${approvedLoans.length}`);
    console.log(`❌ Rejected: ${rejectedLoans.length}`);
    
    if (pendingLoans.length === 0) {
      console.log('\n⚠️ No pending loans found! The pending-applications endpoint will be empty.');
    } else {
      console.log('\n📋 Pending loans:');
      pendingLoans.forEach((loan, index) => {
        console.log(`${index + 1}. ${loan.name} (${loan.collegeEmail}) - ₹${loan.amount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging loans:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugLoans();
