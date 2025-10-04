import mongoose from 'mongoose';
import Loan from './models/loanModel.js';

// Database connection
mongoose.connect('mongodb://localhost:27017/BorrowEase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugLoanData() {
  try {
    console.log('🔍 Checking loan applications data...\n');
    
    // Get all loans
    const allLoans = await Loan.find({});
    console.log(`📊 Total loans in database: ${allLoans.length}`);
    
    // Get pending loans specifically
    const pendingLoans = await Loan.find({ status: 'pending' });
    console.log(`📊 Pending loans: ${pendingLoans.length}`);
    
    if (pendingLoans.length > 0) {
      console.log('\n💳 Pending loan details:');
      pendingLoans.forEach((loan, index) => {
        console.log(`${index + 1}. ${loan.name} (${loan.collegeEmail}) - Amount: ₹${loan.amount} - ID: ${loan._id}`);
      });
      
      // Check for duplicates
      const names = pendingLoans.map(l => l.name);
      const nameCount = {};
      names.forEach(name => {
        nameCount[name] = (nameCount[name] || 0) + 1;
      });
      
      console.log('\n📊 Name frequency in pending loans:');
      Object.entries(nameCount).forEach(([name, count]) => {
        console.log(`${name}: ${count} loans`);
        if (count > 3) {
          console.log(`⚠️ WARNING: ${name} has ${count} loans - possible duplicates!`);
        }
      });
    }
    
    // Check all loans by name
    console.log('\n🔍 All loans by name:');
    const loansByName = {};
    allLoans.forEach(loan => {
      if (!loansByName[loan.name]) {
        loansByName[loan.name] = [];
      }
      loansByName[loan.name].push(loan);
    });
    
    Object.entries(loansByName).forEach(([name, loans]) => {
      console.log(`${name}: ${loans.length} loans`);
      if (loans.length > 5) {
        console.log(`⚠️ ${name} has ${loans.length} loans:`);
        loans.forEach((loan, index) => {
          console.log(`   ${index + 1}. Status: ${loan.status} | Amount: ₹${loan.amount} | Date: ${loan.submittedAt} | ID: ${loan._id}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking loan data:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugLoanData();
