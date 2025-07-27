const mongoose = require('mongoose');
const User = require('./models/userModel');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/borrowease', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Fix KYC status
const fixKYCStatus = async () => {
  try {
    console.log('Searching for users with "approved" KYC status...');
    
    // Find users with 'approved' KYC status
    const usersToFix = await User.find({ 'kyc.status': 'approved' });
    console.log(`Found ${usersToFix.length} users with "approved" KYC status`);
    
    if (usersToFix.length === 0) {
      console.log('No users found with "approved" KYC status. Database is clean.');
      return;
    }
    
    // Update users to use 'verified' instead of 'approved'
    const result = await User.updateMany(
      { 'kyc.status': 'approved' },
      { $set: { 'kyc.status': 'verified' } }
    );
    
    console.log(`Updated ${result.modifiedCount} users successfully`);
    console.log('KYC status migration completed!');
    
    // Verify the update
    const remainingApproved = await User.find({ 'kyc.status': 'approved' });
    console.log(`Remaining users with "approved" status: ${remainingApproved.length}`);
    
  } catch (error) {
    console.error('Error fixing KYC status:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await fixKYCStatus();
  await mongoose.connection.close();
  console.log('Database connection closed');
};

main();
