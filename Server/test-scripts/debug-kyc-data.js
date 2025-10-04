import mongoose from 'mongoose';
import './config/db.js';

const checkKYCData = async () => {
  try {
    console.log('Checking KYC data...');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { default: KYC } = await import('./models/kycModel.js');
    
    // Get all KYC submissions
    const submissions = await KYC.find().limit(5);
    console.log(`Found ${submissions.length} KYC submissions`);
    
    if (submissions.length > 0) {
      console.log('\n=== SAMPLE KYC SUBMISSION ===');
      const sample = submissions[0];
      console.log('ID:', sample._id);
      console.log('User:', sample.userName);
      console.log('Status:', sample.status);
      console.log('Comments:', JSON.stringify(sample.comments, null, 2));
      console.log('Documents structure:', Object.keys(sample.documents || {}));
      
      // Check if documents have the expected fields
      if (sample.documents?.aadhar) {
        console.log('Aadhar doc keys:', Object.keys(sample.documents.aadhar));
      }
      if (sample.documents?.pan) {
        console.log('PAN doc keys:', Object.keys(sample.documents.pan));
      }
    } else {
      console.log('No KYC submissions found in database');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkKYCData();
