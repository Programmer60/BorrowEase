import mongoose from 'mongoose';
import KYC from './models/kycModel.js';
import User from './models/userModel.js';

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

// Create a test KYC submission
const createTestKYC = async () => {
  try {
    console.log('🔍 Creating test KYC submission...');
    
    // Find or create a borrower user
    let borrower = await User.findOne({ role: 'borrower' });
    if (!borrower) {
      console.log('📝 Creating test borrower user...');
      borrower = new User({
        name: 'Test Borrower',
        email: 'testborrower@example.com',
        role: 'borrower',
        phoneNumber: '+919876543210',
        isActive: true
      });
      await borrower.save();
      console.log('✅ Test borrower created');
    }
    
    console.log('✅ Found/Created borrower:', borrower.email);
    
    // Remove existing KYC for this user to create fresh
    await KYC.deleteMany({ userId: borrower._id });
    console.log('🗑️ Removed any existing KYC for this user');
    
    // Create test KYC data
    const testKYCData = {
      userId: borrower._id,
      userName: borrower.name,
      userEmail: borrower.email,
      userPhone: '+919876543210',
      personalInfo: {
        fullName: borrower.name,
        dateOfBirth: '1990-01-01',
        address: '123 Test Street, Test City, Test State - 123456',
        phoneNumber: '+919876543210',
        occupation: 'Software Engineer',
        monthlyIncome: 50000,
      },
      documents: {
        aadhar: {
          number: '123456789012',
          frontImage: 'https://picsum.photos/400/250?random=1',
          backImage: 'https://picsum.photos/400/250?random=2'
        },
        pan: {
          number: 'ABCDE1234F',
          image: 'https://picsum.photos/400/250?random=3'
        },
        selfie: 'https://picsum.photos/300/400?random=4',
        addressProof: {
          docType: 'utility_bill',
          image: 'https://picsum.photos/400/600?random=5'
        },
        incomeProof: {
          docType: 'salary_slip',
          image: 'https://picsum.photos/400/600?random=6'
        }
      },
      verificationStatus: {
        phoneVerification: {
          status: "verified",
          verifiedAt: new Date(),
          phoneNumber: '+919876543210'
        },
        addressVerification: {
          status: "pending"
        },
        biometricVerification: {
          status: "pending"
        }
      },
      status: 'pending',
      submittedAt: new Date(),
      submissionAttempts: 1,
      maxAttemptsReached: false
    };
    
    // Create new KYC
    const kyc = new KYC(testKYCData);
    await kyc.save();
    
    console.log('✅ Test KYC created successfully:', {
      id: kyc._id,
      userId: kyc.userId,
      userName: kyc.userName,
      status: kyc.status,
      phoneVerificationStatus: kyc.verificationStatus.phoneVerification.status
    });
    
    return kyc;
    
  } catch (error) {
    console.error("❌ Error creating test KYC:", error);
    console.error("📍 Error stack:", error.stack);
  }
};

// Main function
const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.log('❌ Failed to connect to database');
    process.exit(1);
  }
  
  await createTestKYC();
  await mongoose.connection.close();
  console.log('🔚 Database connection closed');
};

main().catch(console.error);
