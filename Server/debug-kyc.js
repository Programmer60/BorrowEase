import mongoose from 'mongoose';
import User from './models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

const debugKYC = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/borrowease');
    console.log('Connected to MongoDB');

    // Check all users
    const allUsers = await User.find({});
    console.log('\n=== ALL USERS ===');
    console.log(`Total users: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
      if (user.kyc) {
        console.log(`  KYC Status: ${user.kyc.status || 'No status'}`);
        console.log(`  KYC Data: ${JSON.stringify(user.kyc, null, 2)}`);
      } else {
        console.log('  No KYC data');
      }
    });

    // Check users with KYC
    const usersWithKYC = await User.find({ 
      "kyc": { $exists: true },
      "kyc.status": { $exists: true }
    });
    console.log('\n=== USERS WITH KYC STATUS ===');
    console.log(`Users with KYC: ${usersWithKYC.length}`);
    usersWithKYC.forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
      console.log(`  Status: ${user.kyc.status}`);
      console.log(`  Submitted: ${user.kyc.submittedAt}`);
      console.log(`  Personal Info: ${user.kyc.personalInfo ? 'Yes' : 'No'}`);
      console.log(`  Documents: ${user.kyc.documents ? 'Yes' : 'No'}`);
      if (user.kyc.documents) {
        console.log(`  Aadhar URL: ${user.kyc.documents.aadharUrl ? 'Yes' : 'No'}`);
        console.log(`  PAN URL: ${user.kyc.documents.panUrl ? 'Yes' : 'No'}`);
        console.log(`  Selfie URL: ${user.kyc.documents.selfieUrl ? 'Yes' : 'No'}`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

debugKYC();
