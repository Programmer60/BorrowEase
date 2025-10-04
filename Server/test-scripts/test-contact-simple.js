// Test contact form submission
const testData = {
  name: 'Test User', 
  email: 'test@example.com',
  subject: 'Test Subject',
  message: 'Test message for debugging',
  category: 'general'
};

fetch('http://localhost:5000/api/contact/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Status:', response.status);
  return response.text();
})
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('Error:', error);
});
