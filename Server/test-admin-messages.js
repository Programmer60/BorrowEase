// Test script to fetch contact messages as admin
// You need to be logged in as admin to use this

const testAdminMessages = async () => {
  try {
    // This requires admin authentication token
    const response = await fetch('http://localhost:5000/api/contact/admin/messages', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Admin Messages:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

// Test fetching specific message
const testSpecificMessage = async (messageId) => {
  try {
    const response = await fetch(`http://localhost:5000/api/contact/admin/message/${messageId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Message Details:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

// Test updating message status
const testUpdateStatus = async (messageId) => {
  try {
    const response = await fetch(`http://localhost:5000/api/contact/admin/message/${messageId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'in_progress',
        adminNote: 'Started working on this issue'
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Updated Message:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

// Test responding to a message
const testRespond = async (messageId) => {
  try {
    const response = await fetch(`http://localhost:5000/api/contact/admin/message/${messageId}/respond`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response: 'Thank you for contacting us. We are looking into your issue.',
        sendEmail: true
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response Sent:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

console.log('Available admin functions:');
console.log('- testAdminMessages() - Get all messages');
console.log('- testSpecificMessage(messageId) - Get specific message');
console.log('- testUpdateStatus(messageId) - Update message status');
console.log('- testRespond(messageId) - Respond to message');
console.log('');
console.log('Use the message ID from your test: 68bb6272d8f757f7515c4c97');

// Uncomment to test (you need admin token):
// testAdminMessages();
