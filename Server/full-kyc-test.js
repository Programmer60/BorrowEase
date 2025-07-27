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
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// Full test cycle: create KYC and immediately test review
const fullKYCTest = async () => {
  try {
    console.log('🔍 Full KYC Review Test...');
    
    // Step 1: Create test KYC
    let borrower = await User.findOne({ role: 'borrower' });
    if (!borrower) {
      borrower = new User({
        name: 'Test Borrower',
        email: 'testborrower@example.com',
        role: 'borrower',
        phoneNumber: '+919876543210',
        isActive: true
      });
      await borrower.save();
    }
    
    // Remove existing KYCs
    await KYC.deleteMany({ userId: borrower._id });
    
    // Create fresh KYC
    const kycData = {
      userId: borrower._id,
      userName: borrower.name,
      userEmail: borrower.email,
      userPhone: '+919876543210',
      personalInfo: {
        fullName: borrower.name,
        dateOfBirth: '1990-01-01',
        address: '123 Test Street',
        phoneNumber: '+919876543210',
        occupation: 'Engineer',
        monthlyIncome: 50000,
      },
      documents: {
        aadhar: { number: '123456789012', frontImage: 'test1.jpg', backImage: 'test2.jpg' },
        pan: { number: 'ABCDE1234F', image: 'test3.jpg' },
        selfie: 'test4.jpg'
      },
      verificationStatus: {
        phoneVerification: { status: "verified", verifiedAt: new Date(), phoneNumber: '+919876543210' },
        addressVerification: { status: "pending" },
        biometricVerification: { status: "pending" }
      },
      status: 'pending',
      submittedAt: new Date()
    };
    
    const kyc = new KYC(kycData);
    await kyc.save();
    console.log('✅ Created KYC:', kyc._id, 'Status:', kyc.status);
    
    // Step 2: Immediately test review process
    console.log('🔄 Starting review process...');
    
    // Simulate admin review (like the backend endpoint)
    const kycToReview = await KYC.findById(kyc._id).populate('userId');
    if (!kycToReview) {
      console.log('❌ KYC not found');
      return;
    }
    
    console.log('📋 Found KYC to review:', {
      id: kycToReview._id,
      status: kycToReview.status,
      userName: kycToReview.userName
    });
    
    // Add review comment
    const reviewData = {
      comment: 'Test approval comment',
      reviewedBy: 'Test Admin',
      reviewedAt: new Date()
    };
    
    if (!kycToReview.reviews) {
      kycToReview.reviews = [];
    }
    kycToReview.reviews.push(reviewData);
    
    // Update status
    const newStatus = 'verified'; // or 'rejected'
    kycToReview.status = newStatus;
    kycToReview.reviewedAt = new Date();
    
    console.log('💾 Saving KYC with new status:', newStatus);
    await kycToReview.save();
    
    // Create notification
    const message = newStatus === 'verified' 
      ? 'Congratulations! Your KYC has been verified successfully.' 
      : 'Your KYC submission has been rejected. Please resubmit with correct documents.';
    
    console.log('📧 Creating notification...');
    try {
      const notification = await Notification.create({
        userId: kycToReview.userId._id,
        type: `kyc_${newStatus}`,
        message,
        read: false
      });
      console.log('✅ Notification created:', notification._id);
    } catch (notificationError) {
      console.log('❌ Notification failed:', notificationError.message);
      console.log('📋 Notification details:', {
        userId: kycToReview.userId._id,
        type: `kyc_${newStatus}`,
        message
      });
    }
    
    // Final verification
    const finalKYC = await KYC.findById(kyc._id);
    console.log('🏁 Final KYC status:', finalKYC.status);
    console.log('📊 Reviews count:', finalKYC.reviews?.length || 0);
    
    console.log('✅ Full test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('📍 Stack:', error.stack);
  }
};

// Main function
const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.log('❌ Failed to connect to database');
    process.exit(1);
  }
  
  await fullKYCTest();
  await mongoose.connection.close();
  console.log('🔚 Database connection closed');
};

main().catch(console.error);
