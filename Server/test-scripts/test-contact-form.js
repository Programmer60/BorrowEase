#!/usr/bin/env node
import axios from 'axios';

// Test the contact form submission
async function testContactSubmission() {
  try {
    console.log('🧪 Testing contact form submission...');

    const testData = {
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Message',
      message: 'This is a test message to verify the contact form is working.',
      category: 'general'
    };

    console.log('📧 Sending test contact form data...');
    
    const response = await axios.post('http://localhost:5000/api/contact/submit', testData);
    
    console.log('✅ SUCCESS! Contact form submission worked:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ FAILED! Contact form submission error:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

// Run the test
testContactSubmission();
