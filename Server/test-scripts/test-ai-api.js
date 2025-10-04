// Test script to check AI API endpoint
const fetch = require('node-fetch');

const testAIEndpoint = async () => {
  try {
    console.log('Testing AI Assessment endpoint...');
    
    // Test data - you'll need to replace with actual borrowerId from your database
    const testData = {
      borrowerId: '6771ee0095c3f2003b36a871', // Replace with actual borrower ID
      loanAmount: 25000,
      loanPurpose: 'Education',
      repaymentPeriod: 90
    };
    
    console.log('Sending test data:', testData);
    
    const response = await fetch('http://localhost:5000/api/ai/assess-borrower', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add auth token here if required
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ AI Assessment successful:', result);
    } else {
      const error = await response.text();
      console.log('❌ AI Assessment failed:', error);
    }
    
  } catch (error) {
    console.error('Error testing AI endpoint:', error);
  }
};

testAIEndpoint();
