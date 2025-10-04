// Test admin API endpoints
// Run with: node testAdminAPI.js

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testAdminAPI() {
  try {
    console.log('🧪 Testing Admin API Endpoints...\n');

    // Test getting all loans (should require admin auth)
    console.log('1. Testing GET /loans/admin/all');
    try {
      const response = await fetch(`${API_BASE}/loans/admin/all`);
      console.log(`Status: ${response.status}`);
      const data = await response.json();
      console.log(`Response:`, data);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }

    console.log('\n---\n');

    // Test getting pending loans
    console.log('2. Testing GET /loans/admin/pending');
    try {
      const response = await fetch(`${API_BASE}/loans/admin/pending`);
      console.log(`Status: ${response.status}`);
      const data = await response.json();
      console.log(`Response:`, data);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }

    console.log('\n---\n');

    // Test getting stats
    console.log('3. Testing GET /loans/admin/stats');
    try {
      const response = await fetch(`${API_BASE}/loans/admin/stats`);
      console.log(`Status: ${response.status}`);
      const data = await response.json();
      console.log(`Response:`, data);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAdminAPI();
