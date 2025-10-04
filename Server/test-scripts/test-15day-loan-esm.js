import http from 'http';

const data = JSON.stringify({
  amount: 5000,
  tenureMonths: 0.5
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/loans/preview-interest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer dummy-token',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing 15-day loan (0.5 months) calculation...');

const req = http.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('📊 Response:', body);
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(data);
req.end();
