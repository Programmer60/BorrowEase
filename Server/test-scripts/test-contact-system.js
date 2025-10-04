// Test script for advanced contact message management system
import axios from 'axios';
import { AdvancedSpamDetectionService } from './services/advancedSpamDetection.js';

const BASE_URL = 'http://localhost:3001/api';

// Test admin credentials (you'll need to replace with actual admin token)
const ADMIN_TOKEN = 'your-admin-jwt-token-here';

const testContactSystem = async () => {
  console.log('🧪 Testing Advanced Contact Message Management System\n');

  try {
    // 1. Test message submission with spam detection
    console.log('1️⃣ Testing message submission with spam detection...');
    const testMessages = [
      {
        name: 'John Doe',
        email: 'john@test.com',
        subject: 'Account Help Needed',
        message: 'Hi, I need help with my account login. Can you assist me?',
        category: 'account'
      },
      {
        name: 'Spam Bot',
        email: 'spam@fake.com',
        subject: 'URGENT!!! MAKE MONEY FAST!!!',
        message: 'Click here to make $5000 per day! Free money! Act now! Limited time offer! Credit card required. SSN: 123-45-6789',
        category: 'general'
      },
      {
        name: 'Jane Smith',
        email: 'jane@company.com',
        subject: 'Technical Issue',
        message: 'I am experiencing a bug in the loan application form. The submit button is not working.',
        category: 'technical'
      }
    ];

    for (const msg of testMessages) {
      try {
        const response = await axios.post(`${BASE_URL}/contact/submit`, msg);
        console.log(`✅ Message from ${msg.name}: ${response.data.success ? 'Submitted' : 'Failed'}`);
        if (response.data.spamDetection) {
          console.log(`   🛡️ Spam Score: ${Math.round(response.data.spamDetection.score * 100)}%`);
          console.log(`   🤖 Auto-Action: ${response.data.spamDetection.action}`);
        }
        if (response.data.autoResponse) {
          console.log(`   📧 Auto-Response: ${response.data.autoResponse.type}`);
        }
      } catch (error) {
        console.log(`❌ Failed to submit message from ${msg.name}: ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n2️⃣ Testing admin message retrieval...');
    try {
      const response = await axios.get(`${BASE_URL}/contact/admin/messages`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      
      if (response.data.success) {
        console.log(`✅ Retrieved ${response.data.messages.length} messages`);
        console.log(`📊 Pagination: Page ${response.data.pagination.currentPage} of ${response.data.pagination.totalPages}`);
        
        // Display message summary
        const messages = response.data.messages;
        const summary = {
          pending: messages.filter(m => m.status === 'pending').length,
          resolved: messages.filter(m => m.status === 'resolved').length,
          highRisk: messages.filter(m => m.riskLevel === 'high').length,
          needsReview: messages.filter(m => m.requiresReview).length,
          autoReplied: messages.filter(m => m.autoResponseSent).length
        };
        
        console.log('📈 Message Summary:');
        Object.entries(summary).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
    } catch (error) {
      console.log(`❌ Failed to retrieve admin messages: ${error.response?.data?.error || error.message}`);
      console.log('⚠️ Make sure to set a valid ADMIN_TOKEN in the script');
    }

    console.log('\n3️⃣ Testing smart filters...');
    const filters = [
      { requiresReview: true, name: 'Messages needing review' },
      { spamScore: 'high', name: 'High spam risk messages' },
      { status: 'pending', name: 'Pending messages' },
      { autoResponseOnly: true, name: 'Auto-responded messages' }
    ];

    for (const filter of filters) {
      try {
        const params = new URLSearchParams(filter);
        const response = await axios.get(`${BASE_URL}/contact/admin/messages?${params}`, {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        
        if (response.data.success) {
          console.log(`✅ ${filter.name}: ${response.data.messages.length} messages`);
        }
      } catch (error) {
        console.log(`❌ Filter test failed for ${filter.name}: ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n4️⃣ Testing bulk actions (simulation)...');
    // Note: This would need actual message IDs from your database
    console.log('⚠️ Bulk action testing requires actual message IDs from database');
    console.log('   To test bulk actions:');
    console.log('   1. Get message IDs from admin panel');
    console.log('   2. POST to /api/contact/admin/messages/bulk-action');
    console.log('   3. Include: { messageIds: [id1, id2], action: "resolve" }');

    console.log('\n✅ Test completed! Check your admin panel to see the results.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Enhanced test for spam detection
const testSpamDetection = async () => {
  console.log('\n🛡️ Testing Spam Detection Patterns...');
  
  const testCases = [
    {
      message: 'Hello, I need help with my account',
      expected: 'low'
    },
    {
      message: 'URGENT!!! FREE MONEY!!! Click here NOW!!! Limited time offer!!! Make $5000 today!!!',
      expected: 'high'
    },
    {
      message: 'Please send me your credit card number and SSN: 123-45-6789',
      expected: 'high'
    },
    {
      message: 'I am having trouble logging into my account. Can you help?',
      expected: 'low'
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    try {
      const result = await AdvancedSpamDetectionService.analyzeMessage({
        message: test.message,
        email: 'test@example.com'
      });
      
      console.log(`Test ${i + 1}:`);
      console.log(`  Message: "${test.message.substring(0, 50)}..."`);
      console.log(`  Spam Score: ${Math.round(result.score * 100)}%`);
      console.log(`  Risk Level: ${result.riskLevel}`);
      console.log(`  Expected: ${test.expected} | Actual: ${result.riskLevel} ${result.riskLevel === test.expected ? '✅' : '❌'}`);
      console.log('');
    } catch (error) {
      console.log(`Test ${i + 1} failed:`, error.message);
      console.log('');
    }
  }
};

// Main execution function
const runTests = async () => {
  await testContactSystem();
  await testSpamDetection();
};

// Run tests
runTests().catch(console.error);
