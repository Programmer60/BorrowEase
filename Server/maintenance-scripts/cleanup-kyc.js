import mongoose from "mongoose";
import User from "./models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/borrowease")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

async function cleanupKYC() {
  try {
    // Find users who have KYC status but no actual submission data
    const usersWithEmptyKYC = await User.find({
      $or: [
        { "kyc.status": { $exists: true }, "kyc.submittedAt": { $exists: false } },
        { "kyc.status": { $exists: true }, "kyc.personalInfo.fullName": { $exists: false } }
      ]
    });

    console.log(`Found ${usersWithEmptyKYC.length} users with empty KYC data`);

    for (const user of usersWithEmptyKYC) {
      console.log(`Cleaning KYC data for user: ${user.email}`);
      await User.findByIdAndUpdate(user._id, { $unset: { kyc: 1 } });
    }

    console.log("KYC cleanup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupKYC();
