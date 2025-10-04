// Update loans with null status to pending
import mongoose from 'mongoose';
import Loan from './models/loanModel.js';

async function updateLoanStatuses() {
  try {
    await mongoose.connect('mongodb://localhost:27017/BorrowEase');
    console.log('Connected to MongoDB');

    // Update all loans with null status to pending
    const result = await Loan.updateMany(
      { status: null },
      { $set: { status: 'pending' } }
    );
    
    console.log('Updated', result.modifiedCount, 'loans to pending status');
    
    // Check the status distribution again
    const statusStats = await Loan.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('New status distribution:');
    statusStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });
    
    mongoose.disconnect();
    console.log('✅ Update complete');
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

updateLoanStatuses();
