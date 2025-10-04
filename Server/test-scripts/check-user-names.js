const { connectDB } = require('./config/db');
const User = require('./models/userModel');

const checkUserNames = async () => {
  try {
    await connectDB();
    console.log('Connected to database');
    
    const users = await User.find({}, 'name email role').limit(10);
    console.log('\n=== User Names in Database ===');
    users.forEach(user => {
      console.log(`Name: "${user.name}" | Email: ${user.email} | Role: ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUserNames();
