// Quick test script to verify loan creation API
const fetch = require('node-fetch');

async function testLoanCreation() {
  try {
    const response = await fetch('http://localhost:5000/api/loans/preview-interest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but test the route
      },
      body: JSON.stringify({
        amount: 4500,
        tenureMonths: 1,
        interestRate: null
      })
    });
    
    console.log('Status:', response.status);
    console.log('Response:', await response.text());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLoanCreation();
