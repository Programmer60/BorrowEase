// Simple test to check fraud detection API
const http = require('http');

console.log('🚀 Starting Fraud Alert Test...');
console.log('🌐 Testing server on localhost:5000');

// Test server connection
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/fraud/alerts',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('\n🔍 Testing fraud alerts endpoint...');

const req = http.request(options, (res) => {
  console.log(`📡 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      if (res.statusCode === 200) {
        const result = JSON.parse(data);
        console.log('✅ Success! Fraud detection is working');
        console.log(`🚨 Active Alerts: ${result.alerts ? result.alerts.length : 0}`);
        console.log(`📊 Total Checked: ${result.stats ? result.stats.totalChecked : 0}`);
        console.log(`🔍 Flagged Fraud: ${result.stats ? result.stats.flaggedFraud : 0}`);
        
        if (result.alerts && result.alerts.length > 0) {
          console.log('\n🚨 Recent Fraud Alerts:');
          result.alerts.slice(0, 2).forEach((alert, index) => {
            console.log(`\nAlert ${index + 1}:`);
            console.log(`  👤 Borrower: ${alert.borrowerName}`);
            console.log(`  📊 Risk Score: ${alert.riskScore}/100`);
            console.log(`  ⚠️ Risk Level: ${alert.riskLevel}`);
            console.log(`  🔍 Fraud Type: ${alert.fraudType}`);
          });
        }
      } else if (res.statusCode === 401) {
        console.log('🔐 Authentication required - endpoint is properly secured ✅');
      } else if (res.statusCode === 403) {
        console.log('🚫 Admin access required - endpoint is properly secured ✅');
      } else {
        console.log(`⚠️ Unexpected status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
      }
    } catch (error) {
      console.log(`❌ Error parsing response: ${error.message}`);
      console.log(`Raw response: ${data}`);
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ Request failed: ${error.message}`);
  console.log('💡 Make sure the BorrowEase server is running on port 5000');
});

req.setTimeout(5000, () => {
  console.log('⏰ Request timeout - server may not be responding');
  req.destroy();
});

req.end();

// Test basic server connection
console.log('\n🔌 Testing basic server connection...');

const basicOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/',
  method: 'GET'
};

const basicReq = http.request(basicOptions, (res) => {
  console.log(`✅ Server is running! Status: ${res.statusCode}`);
});

basicReq.on('error', (error) => {
  console.log(`❌ Server connection failed: ${error.message}`);
});

basicReq.end();

console.log('\n📋 Test completed! Check the results above.');
