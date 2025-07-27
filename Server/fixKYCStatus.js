import mongoose from 'mongoose';
import User from './models/userModel.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/BorrowEase', {
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
    console.log('Searching for users with problematic KYC status...');
    
    // Try different possible field paths for KYC status
    const possibleQueries = [
      { 'kyc.status': 'approved' },
      { 'kycStatus': 'approved' },
      { 'kyc': 'approved' }
    ];
    
    let totalFixed = 0;
    
    for (const query of possibleQueries) {
      console.log(`\nChecking query:`, query);
      
      const usersToFix = await User.find(query);
      console.log(`Found ${usersToFix.length} users with this query`);
      
      if (usersToFix.length > 0) {
        console.log('Sample user structure:', JSON.stringify(usersToFix[0].toObject(), null, 2));
        
        // Update these users
        const updateQuery = Object.keys(query).reduce((acc, key) => {
          if (query[key] === 'approved') {
            acc[`$set`] = acc[`$set`] || {};
            acc[`$set`][key] = 'verified';
          }
          return acc;
        }, {});
        
        const result = await User.updateMany(query, updateQuery);
        console.log(`Updated ${result.modifiedCount} users with this query`);
        totalFixed += result.modifiedCount;
      }
    }
    
    // Also check for any documents containing 'approved' anywhere
    console.log('\nSearching for any documents containing "approved"...');
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}`);
    
    let problematicUsers = [];
    for (const user of allUsers) {
      const userStr = JSON.stringify(user.toObject());
      if (userStr.includes('"approved"')) {
        problematicUsers.push(user);
        console.log(`Found problematic user: ${user.email}`);
        console.log('User structure:', JSON.stringify(user.toObject(), null, 2));
      }
    }
    
    if (problematicUsers.length > 0) {
      console.log(`\nFound ${problematicUsers.length} users with "approved" in their data`);
      
      // Manual fix for these users
      for (const user of problematicUsers) {
        let userObj = user.toObject();
        let userStr = JSON.stringify(userObj);
        let updatedStr = userStr.replace(/"approved"/g, '"verified"');
        let updatedObj = JSON.parse(updatedStr);
        
        // Update the user
        await User.findByIdAndUpdate(user._id, updatedObj);
        console.log(`Manually updated user: ${user.email}`);
        totalFixed++;
      }
    }
    
    console.log(`\nTotal users fixed: ${totalFixed}`);
    console.log('KYC status migration completed!');
    
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
