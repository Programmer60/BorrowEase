// Simple admin message viewer test
// Replace 'YOUR_ADMIN_TOKEN' with actual admin JWT token from browser localStorage

const viewContactMessages = async () => {
  try {
    // Get your admin token from browser localStorage after logging in as admin
    const adminToken = 'YOUR_ADMIN_TOKEN_FROM_BROWSER'; // Replace this
    
    const response = await fetch('http://localhost:5000/api/contact/admin/messages', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      console.log('❌ Unauthorized - You need to be logged in as admin');
      console.log('📝 Steps to get admin token:');
      console.log('   1. Login to your admin account in the browser');
      console.log('   2. Open browser developer tools (F12)'); 
      console.log('   3. Go to Application tab > Local Storage');
      console.log('   4. Copy the "token" value');
      console.log('   5. Replace YOUR_ADMIN_TOKEN_FROM_BROWSER with that value');
      return;
    }

    console.log('Response Status:', response.status);
    const data = await response.json();
    
    if (data.success) {
      console.log('📧 Contact Messages Found:', data.messages.length);
      console.log('📊 Pagination:', data.pagination);
      
      data.messages.forEach((msg, index) => {
        console.log(`\n--- Message ${index + 1} ---`);
        console.log('ID:', msg._id);
        console.log('From:', msg.name, '(' + msg.email + ')');
        console.log('Subject:', msg.subject);
        console.log('Category:', msg.category);
        console.log('Priority:', msg.priority);
        console.log('Status:', msg.status);
        console.log('Date:', new Date(msg.createdAt).toLocaleString());
        console.log('Message:', msg.message.substring(0, 100) + '...');
      });
    } else {
      console.log('❌ Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
};

// Test with the message we just created
const viewSpecificMessage = async (messageId = '68bb6272d8f757f7515c4c97') => {
  try {
    const adminToken = 'YOUR_ADMIN_TOKEN_FROM_BROWSER'; // Replace this
    
    const response = await fetch(`http://localhost:5000/api/contact/admin/message/${messageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Message Details:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

console.log('🔧 Admin Contact Message Tools:');
console.log('📧 viewContactMessages() - View all contact messages');
console.log('🔍 viewSpecificMessage("messageId") - View specific message');
console.log('');
console.log('⚠️  You need to replace YOUR_ADMIN_TOKEN_FROM_BROWSER with actual admin token');
console.log('');

// Uncomment when you have admin token:
// viewContactMessages();
