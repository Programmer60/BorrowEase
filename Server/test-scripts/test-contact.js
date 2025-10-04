// Simple test for contact route
import fetch from 'node-fetch';

const testContact = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/contact/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message for debugging',
        category: 'general'
      })
    });

    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testContact();
