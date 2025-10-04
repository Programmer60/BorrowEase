import mongoose from 'mongoose';
require('./config/db');

// Test script to create sample KYC data with document URLs
const testDocumentViewer = async () => {
  try {
    console.log('Connecting to database...');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const KYC = require('./models/kycModel');
    
    // Create test KYC data with sample Cloudinary URLs
    const testKYC = {
      userId: new mongoose.Types.ObjectId(),
      userName: "Test User",
      userEmail: "test@example.com",
      userPhone: "1234567890",
      personalInfo: {
        fullName: "Test User Full Name",
        dateOfBirth: new Date('1990-01-01'),
        address: "Test Address, Test City",
        occupation: "Software Engineer",
        monthlyIncome: 50000
      },
      documents: {
        aadhar: {
          number: "123456789012",
          frontImage: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample-aadhar-front.jpg",
          backImage: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample-aadhar-back.jpg"
        },
        pan: {
          number: "ABCDE1234F",
          frontImage: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample-pan.jpg"
        },
        selfie: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample-selfie.jpg",
        addressProof: {
          docType: "utility_bill",
          image: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample-address-proof.jpg"
        },
        incomeProof: {
          docType: "salary_slip",
          image: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample-income-proof.jpg"
        }
      },
      status: 'pending',
      submittedAt: new Date()
    };
    
    // Check if test data already exists
    const existing = await KYC.findOne({ userEmail: "test@example.com" });
    if (existing) {
      console.log('Test KYC data already exists:', existing._id);
    } else {
      const newKYC = new KYC(testKYC);
      await newKYC.save();
      console.log('Test KYC data created successfully:', newKYC._id);
    }
    
    // Display sample document structure
    const sampleKYC = await KYC.findOne({ userEmail: "test@example.com" });
    console.log('\n=== SAMPLE DOCUMENT STRUCTURE ===');
    console.log('Aadhar front:', sampleKYC.documents.aadhar.frontImage);
    console.log('Aadhar back:', sampleKYC.documents.aadhar.backImage);
    console.log('PAN front:', sampleKYC.documents.pan.frontImage);
    console.log('Selfie:', sampleKYC.documents.selfie);
    console.log('Address Proof:', sampleKYC.documents.addressProof.image);
    console.log('Income Proof:', sampleKYC.documents.incomeProof.image);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testDocumentViewer();
