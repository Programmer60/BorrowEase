import mongoose from 'mongoose';
import KYC from './models/kycModel.js';
import User from './models/userModel.js';
import Notification from './models/notificationModel.js';

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

// Test KYC review process
const testKYCReview = async () => {
  try {
    console.log('🔍 Testing KYC Review Process...');
    
    // Find a pending KYC submission
    const allKYCs = await KYC.find({});
    console.log(`📋 Total KYCs found: ${allKYCs.length}`);
    
    if (allKYCs.length > 0) {
      allKYCs.forEach((kyc, index) => {
        console.log(`📄 KYC ${index + 1}: ID=${kyc._id}, Status=${kyc.status}, User=${kyc.userName}`);
      });
    }
    
    const pendingKYC = await KYC.findOne({ status: 'pending' })
      .populate('userId', 'name email');
    
    if (!pendingKYC) {
      console.log('❌ No pending KYC submissions found for testing');
      return;
    }
    
    console.log('✅ Found pending KYC:', pendingKYC._id);
    console.log('👤 User:', pendingKYC.userId);
    
    // Test the review process
    const kycId = pendingKYC._id;
    const status = 'verified'; // Test approval
    const comments = 'Test approval comment';
    const adminName = 'Test Admin';
    
    console.log('🔄 Starting review process...');
    
    // First get the existing KYC to access current comments
    const existingKYC = await KYC.findById(kycId);
    if (!existingKYC) {
      console.log('❌ KYC not found:', kycId);
      return;
    }
    console.log('✅ Found existing KYC');
    
    // Prepare the new comment object if comments are provided
    let updatedComments = existingKYC.comments || [];
    if (comments && comments.trim()) {
      const newComment = {
        comment: comments.trim(),
        addedBy: adminName,
        addedAt: new Date()
      };
      updatedComments.push(newComment);
      console.log('📝 Added new comment:', newComment);
    }

    console.log('🔄 Updating KYC status to:', status);
    // Update the KYC with new status and comments
    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      {
        status,
        reviewedAt: new Date(),
        reviewedBy: adminName,
        comments: updatedComments
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!kyc) {
      console.log('❌ Failed to update KYC');
      return;
    }
    console.log('✅ KYC updated successfully:', kyc._id);

    if (!kyc.userId || !kyc.userId._id) {
      console.log('❌ No user ID found in KYC:', kyc.userId);
      return;
    }

    console.log('🔄 Updating user KYC status for user:', kyc.userId._id);
    // Update user's KYC status
    const userUpdate = await User.findByIdAndUpdate(
      kyc.userId._id, 
      { kycStatus: status === 'verified' ? 'verified' : 'rejected' },
      { new: true }
    );
    
    if (!userUpdate) {
      console.log('⚠️ User not found, but continuing:', kyc.userId._id);
    } else {
      console.log('✅ User KYC status updated:', userUpdate.kycStatus);
    }

    console.log('📧 Creating notification for user:', kyc.userId._id);
    // Create notification for user
    const message = status === 'verified' 
      ? "Congratulations! Your KYC has been verified. You can now access all features."
      : `Your KYC submission has been rejected. ${comments ? `Reason: ${comments}` : 'Please review and resubmit.'}`;

    try {
      await Notification.create({
        userId: kyc.userId._id,
        type: `kyc_${status}`,
        message,
        isRead: false
      });
      console.log('✅ Notification created successfully');
    } catch (notificationError) {
      console.log('⚠️ Notification creation failed:', notificationError.message);
      // Don't fail the entire request if notification fails
    }

    console.log('✅ KYC review completed successfully');
    console.log('📊 Final result:', {
      success: true,
      message: `KYC ${status} successfully`,
      kycId: kyc._id,
      userId: kyc.userId._id,
      userEmail: kyc.userId.email
    });
    
  } catch (error) {
    console.error("❌ Error during KYC review test:", error);
    console.error("📍 Error stack:", error.stack);
    console.error("🔍 Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    });
  }
};

// Main function
const main = async () => {
  await connectDB();
  await testKYCReview();
  await mongoose.connection.close();
  console.log('🔚 Database connection closed');
};

main().catch(console.error);
