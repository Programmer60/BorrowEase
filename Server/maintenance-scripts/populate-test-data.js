import mongoose from 'mongoose';
import User from './models/userModel.js';
import Loan from './models/loanModel.js';

// Database connection
mongoose.connect('mongodb://localhost:27017/BorrowEase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function populateTestData() {
  try {
    console.log('🚀 Populating database with test data...\n');
    
    // Create test borrowers
    const borrowers = [
      {
        name: 'John Doe',
        email: 'john.borrower@student.ac.in',
        role: 'borrower',
        trustScore: 75,
        kycStatus: 'verified'
      },
      {
        name: 'Jane Smith',
        email: 'jane.borrower@student.ac.in',
        role: 'borrower',
        trustScore: 60,
        kycStatus: 'pending'
      },
      {
        name: 'Mike Johnson',
        email: 'mike.borrower@student.ac.in',
        role: 'borrower',
        trustScore: 85,
        kycStatus: 'verified'
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.borrower@student.ac.in',
        role: 'borrower',
        trustScore: 45,
        kycStatus: 'not_submitted'
      }
    ];

    // Create test lenders
    const lenders = [
      {
        name: 'Alex Investor',
        email: 'alex.lender@investor.com',
        role: 'lender',
        trustScore: 90
      },
      {
        name: 'Emma Capital',
        email: 'emma.capital@funds.com',
        role: 'lender',
        trustScore: 95
      }
    ];

    // Create users
    console.log('👥 Creating test users...');
    const createdBorrowers = await User.insertMany(borrowers);
    const createdLenders = await User.insertMany(lenders);
    
    console.log(`✅ Created ${createdBorrowers.length} borrowers`);
    console.log(`✅ Created ${createdLenders.length} lenders`);

    // Create some test loan applications
    const loanApplications = [
      {
        name: 'John Doe',
        collegeEmail: 'john.borrower@student.ac.in',
        phoneNumber: '+91-9876543210',
        amount: 50000,
        purpose: 'education',
        repaymentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        status: 'pending',
        submittedAt: new Date(),
        tenureMonths: 3,
        interestRate: 12,
        monthlyPayment: 17160,
        totalRepayment: 51480
      },
      {
        name: 'Jane Smith',
        collegeEmail: 'jane.borrower@student.ac.in',
        phoneNumber: '+91-9876543211',
        amount: 25000,
        purpose: 'business',
        repaymentDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        status: 'pending',
        submittedAt: new Date(),
        tenureMonths: 2,
        interestRate: 15,
        monthlyPayment: 13125,
        totalRepayment: 26250
      },
      {
        name: 'Mike Johnson',
        collegeEmail: 'mike.borrower@student.ac.in',
        phoneNumber: '+91-9876543212',
        amount: 75000,
        purpose: 'medical',
        repaymentDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
        status: 'pending',
        submittedAt: new Date(),
        tenureMonths: 4,
        interestRate: 10,
        monthlyPayment: 19375,
        totalRepayment: 77500
      }
    ];

    console.log('\n💳 Creating test loan applications...');
    const createdLoans = await Loan.insertMany(loanApplications);
    console.log(`✅ Created ${createdLoans.length} loan applications`);

    console.log('\n🎉 Test data populated successfully!');
    console.log('\n📊 Summary:');
    console.log(`👤 Total borrowers: ${createdBorrowers.length}`);
    console.log(`💰 Total lenders: ${createdLenders.length}`);
    console.log(`📄 Total loan applications: ${createdLoans.length}`);
    
    console.log('\n🔍 You can now test the borrower assessment tool!');
    
  } catch (error) {
    console.error('❌ Error populating test data:', error);
  } finally {
    mongoose.connection.close();
  }
}

populateTestData();
