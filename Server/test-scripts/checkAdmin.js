import mongoose from "mongoose";
import User from "./models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const setupTestAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    
    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: "admin" });
    
    if (existingAdmin) {
      console.log(`✅ Admin already exists: ${existingAdmin.name} (${existingAdmin.email})`);
      console.log("You can login with this account to access admin panel");
      process.exit(0);
    }
    
    // Check if any users exist
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log("💡 No users found. The first user to register will automatically become admin.");
      console.log("Just register/login normally and you'll get admin access!");
    } else {
      console.log("📋 Existing users:");
      const users = await User.find().select("name email role");
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
      });
      
      console.log("\n💡 To make any user admin, run:");
      console.log("node makeAdmin.js <email>");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

setupTestAdmin();
