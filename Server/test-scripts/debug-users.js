import mongoose from 'mongoose';
import User from './models/userModel.js';

// Database connection
mongoose.connect('mongodb://localhost:27017/BorrowEase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugUsers() {
  try {
    console.log('🔍 Debugging users in database...\n');
    
    // Get all users
    const allUsers = await User.find({}).select('_id name email role createdAt');
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    if (allUsers.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }
    
    console.log('\n👥 All users:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - Created: ${user.createdAt}`);
    });
    
    // Count by role
    const borrowers = await User.find({ role: 'borrower' });
    const lenders = await User.find({ role: 'lender' });
    const admins = await User.find({ role: 'admin' });
    
    console.log('\n📈 Role distribution:');
    console.log(`👤 Borrowers: ${borrowers.length}`);
    console.log(`💰 Lenders: ${lenders.length}`);
    console.log(`👨‍💼 Admins: ${admins.length}`);
    
    if (borrowers.length === 0) {
      console.log('\n⚠️ No borrowers found! This explains why the dropdown is empty.');
      console.log('💡 Solution: Some users need to have role: "borrower"');
    } else {
      console.log('\n✅ Borrowers found:');
      borrowers.forEach((borrower, index) => {
        console.log(`${index + 1}. ${borrower.name} (${borrower.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging users:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugUsers();
