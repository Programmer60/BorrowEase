import mongoose from 'mongoose';
import User from './models/userModel.js';

// Database connection
mongoose.connect('mongodb://localhost:27017/BorrowEase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugUserDetails() {
  try {
    console.log('🔍 Detailed user analysis...\n');
    
    // Get all users with detailed info
    const allUsers = await User.find({}).select('_id name email role createdAt');
    console.log(`📊 Total users in database: ${allUsers.length}\n`);
    
    console.log('👥 All users with details:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('   ---');
    });
    
    // Check for duplicates by email
    const emails = allUsers.map(u => u.email);
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    
    if (duplicateEmails.length > 0) {
      console.log('\n⚠️ DUPLICATE EMAILS FOUND:');
      duplicateEmails.forEach(email => {
        const duplicates = allUsers.filter(u => u.email === email);
        console.log(`📧 ${email}:`);
        duplicates.forEach(dup => {
          console.log(`   - ID: ${dup._id}, Role: ${dup.role}, Name: ${dup.name}`);
        });
      });
    }
    
    // Check for similar names
    const names = allUsers.map(u => u.name.toLowerCase());
    console.log('\n🔍 Checking for similar names...');
    const shivamUsers = allUsers.filter(u => u.name.toLowerCase().includes('shivam'));
    if (shivamUsers.length > 1) {
      console.log('⚠️ Multiple users with "Shivam" in name:');
      shivamUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role} - ID: ${user._id}`);
      });
    }
    
    // Test the exact query used by the endpoint
    console.log('\n🧪 Testing borrower query used by endpoint:');
    const borrowers = await User.find({ role: 'borrower' })
      .select('_id name email kycStatus createdAt')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Borrower query returned ${borrowers.length} users:`);
    borrowers.forEach((borrower, index) => {
      console.log(`${index + 1}. ${borrower.name} (${borrower.email}) - ID: ${borrower._id}`);
    });
    
  } catch (error) {
    console.error('❌ Error in detailed analysis:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugUserDetails();
