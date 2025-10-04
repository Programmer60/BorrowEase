import mongoose from 'mongoose';
import User from './models/userModel.js';

// Database connection
mongoose.connect('mongodb://localhost:27017/BorrowEase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupDuplicateUsers() {
  try {
    console.log('🔍 Checking for duplicate/corrupted user records...\n');
    
    // Find all users with email mishrashivam7465@gmail.com
    const shivamUsers = await User.find({ email: 'mishrashivam7465@gmail.com' });
    console.log(`📊 Found ${shivamUsers.length} records for mishrashivam7465@gmail.com:`);
    
    shivamUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id} | Role: ${user.role} | Name: ${user.name} | Created: ${user.createdAt}`);
    });
    
    // Find all borrowers
    const allBorrowers = await User.find({ role: 'borrower' });
    console.log(`\n📊 Total borrowers found: ${allBorrowers.length}`);
    
    // Check for duplicates by email among borrowers
    const borrowerEmails = {};
    allBorrowers.forEach(borrower => {
      if (borrowerEmails[borrower.email]) {
        borrowerEmails[borrower.email].push(borrower);
      } else {
        borrowerEmails[borrower.email] = [borrower];
      }
    });
    
    console.log('\n🔍 Checking for duplicate borrower emails:');
    Object.entries(borrowerEmails).forEach(([email, users]) => {
      if (users.length > 1) {
        console.log(`⚠️ DUPLICATE: ${email} has ${users.length} records:`);
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user._id} | Role: ${user.role}`);
        });
      }
    });
    
    // Clean up strategy
    console.log('\n🧹 CLEANUP STRATEGY:');
    console.log('1. Keep only ONE admin record for mishrashivam7465@gmail.com');
    console.log('2. Delete all borrower records for mishrashivam7465@gmail.com');
    console.log('3. Keep legitimate borrowers only');
    
    // Show what will be deleted
    const corruptedRecords = allBorrowers.filter(b => b.email === 'mishrashivam7465@gmail.com');
    console.log(`\n❌ Will delete ${corruptedRecords.length} corrupted borrower records for admin user`);
    
    // Perform cleanup
    if (corruptedRecords.length > 0) {
      console.log('\n🔥 EXECUTING CLEANUP...');
      const deleteResult = await User.deleteMany({ 
        email: 'mishrashivam7465@gmail.com', 
        role: 'borrower' 
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} corrupted borrower records`);
      
      // Verify cleanup
      const remainingBorrowers = await User.find({ role: 'borrower' });
      console.log(`\n✅ Remaining borrowers after cleanup: ${remainingBorrowers.length}`);
      remainingBorrowers.forEach((borrower, index) => {
        console.log(`${index + 1}. ${borrower.name} (${borrower.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
  } finally {
    mongoose.connection.close();
  }
}

cleanupDuplicateUsers();
