import mongoose from "mongoose";
import User from "./models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Make a user admin by email
const makeUserAdmin = async (email) => {
  try {
    await connectDB();
    
    const user = await User.findOneAndUpdate(
      { email: email },
      { role: "admin" },
      { new: true }
    );
    
    if (user) {
      console.log(`✅ Successfully made ${email} an admin!`);
      console.log(`User: ${user.name} (${user.email}) - Role: ${user.role}`);
    } else {
      console.log(`❌ User with email ${email} not found`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log("Usage: node makeAdmin.js <email>");
  console.log("Example: node makeAdmin.js user@example.com");
  process.exit(1);
}

makeUserAdmin(email);
