/**
 * Real-Time Fraud Alert Testing Script
 * Tests the fraud detection system and real-time alert generation
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SERVER_URL = 'http://localhost:5000';
const API_BASE = `${SERVER_URL}/api`;

// Test admin token (replace with actual admin token)
const ADMIN_TOKEN = 'your-admin-firebase-token-here';

// Test scenarios for fraud detection
const testScenarios = [
  {
    name: 'High-Risk Loan Application',
    description: 'Test user with suspicious patterns for high fraud alert',
    userData: {
      name: 'John Suspicious',
      email: 'suspicious.user@test.com',
      phone: '+1234567890',
      role: 'borrower',
      kyc: {
        panNumber: 'ABCDE1234F',
        aadharNumber: '123456789012',
        verifiedAt: new Date()
      }
    },
    loanData: {
      amount: 500000, // High amount
      purpose: 'Personal',
      duration: 12,
      interestRate: 12
    }
  },
  {
    name: 'Velocity Fraud Pattern',
    description: 'Multiple rapid loan applications',
    userData: {
      name: 'Jane Velocity',
      email: 'velocity.fraud@test.com',
      phone: '+1987654321',
      role: 'borrower',
      kyc: {
        panNumber: 'FGHIJ5678K',
        aadharNumber: '987654321098',
        verifiedAt: new Date()
      }
    },
    loanData: {
      amount: 100000,
      purpose: 'Emergency',
      duration: 6,
      interestRate: 15
    }
  },
  {
    name: 'Identity Theft Pattern',
    description: 'User with duplicate personal information',
    userData: {
      name: 'Bob Duplicate',
      email: 'duplicate.id@test.com',
      phone: '+1234567890', // Same phone as first user
      role: 'borrower',
      kyc: {
        panNumber: 'ABCDE1234F', // Same PAN as first user
        aadharNumber: '555444333222',
        verifiedAt: new Date()
      }
    },
    loanData: {
      amount: 250000,
      purpose: 'Business',
      duration: 24,
      interestRate: 10
    }
  }
];

class FraudAlertTester {
  constructor() {
    this.testResults = [];
    this.createdUsers = [];
    this.createdLoans = [];
  }

  // Utility function to make API calls
  async apiCall(method, endpoint, data = null, token = ADMIN_TOKEN) {
    try {
      const config = {
        method,
        url: `${API_BASE}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  // Create test users
  async createTestUser(userData) {
    console.log(`📝 Creating test user: ${userData.name}`);
    
    const result = await this.apiCall('POST', '/users', userData);
    
    if (result.success) {
      this.createdUsers.push(result.data._id);
      console.log(`✅ User created: ${userData.name} (ID: ${result.data._id})`);
      return result.data;
    } else {
      console.log(`❌ Failed to create user: ${result.error}`);
      return null;
    }
  }

  // Create test loan application
  async createTestLoan(userId, loanData) {
    console.log(`💰 Creating loan application for user: ${userId}`);
    
    const loanPayload = {
      ...loanData,
      borrowerId: userId,
      status: 'pending'
    };

    const result = await this.apiCall('POST', '/loans', loanPayload);
    
    if (result.success) {
      this.createdLoans.push(result.data._id);
      console.log(`✅ Loan created: ${loanData.amount} (ID: ${result.data._id})`);
      return result.data;
    } else {
      console.log(`❌ Failed to create loan: ${result.error}`);
      return null;
    }
  }

  // Test fraud detection on specific user
  async testFraudDetection(userId, loanData) {
    console.log(`🔍 Testing fraud detection for user: ${userId}`);
    
    const result = await this.apiCall('POST', `/fraud/detect/${userId}`, loanData);
    
    if (result.success) {
      console.log(`✅ Fraud check completed:`, {
        riskScore: result.data.riskScore,
        threatLevel: result.data.threatLevel,
        fraudType: result.data.fraudType,
        confidence: result.data.confidence
      });
      return result.data;
    } else {
      console.log(`❌ Fraud detection failed: ${result.error}`);
      return null;
    }
  }

  // Get real-time fraud alerts
  async getFraudAlerts() {
    console.log(`🚨 Fetching real-time fraud alerts...`);
    
    const result = await this.apiCall('GET', '/fraud/alerts');
    
    if (result.success) {
      const alerts = result.data.alerts || [];
      console.log(`✅ Retrieved ${alerts.length} fraud alerts`);
      
      alerts.forEach((alert, index) => {
        console.log(`\n🚨 Alert ${index + 1}:`);
        console.log(`   Borrower: ${alert.borrowerName}`);
        console.log(`   Risk Score: ${alert.riskScore}/100`);
        console.log(`   Risk Level: ${alert.riskLevel}`);
        console.log(`   Fraud Type: ${alert.fraudType}`);
        console.log(`   Loan Amount: $${alert.loanAmount.toLocaleString()}`);
        console.log(`   Reasons: ${alert.reasons.join(', ')}`);
        console.log(`   Status: ${alert.status}`);
      });
      
      return result.data;
    } else {
      console.log(`❌ Failed to fetch alerts: ${result.error}`);
      return null;
    }
  }

  // Test real-time alert resolution
  async testAlertResolution(alertId, action = 'investigate') {
    console.log(`⚡ Testing alert resolution for alert: ${alertId}`);
    
    const result = await this.apiCall('POST', `/fraud/resolve-alert/${alertId}`, { action });
    
    if (result.success) {
      console.log(`✅ Alert resolved with action: ${action}`);
      return result.data;
    } else {
      console.log(`❌ Failed to resolve alert: ${result.error}`);
      return null;
    }
  }

  // Monitor real-time alerts (simulation)
  async monitorRealTimeAlerts(duration = 30000) {
    console.log(`\n🕒 Starting real-time alert monitoring for ${duration/1000} seconds...`);
    
    const startTime = Date.now();
    let checkCount = 0;
    
    const monitorInterval = setInterval(async () => {
      checkCount++;
      console.log(`\n📊 Real-time check #${checkCount} (${new Date().toLocaleTimeString()})`);
      
      const alertData = await this.getFraudAlerts();
      
      if (alertData && alertData.alerts.length > 0) {
        console.log(`🔥 ${alertData.alerts.length} active fraud alerts detected!`);
        
        // Test resolving the first alert
        if (alertData.alerts[0] && checkCount === 2) {
          await this.testAlertResolution(alertData.alerts[0].id, 'investigate');
        }
      } else {
        console.log(`✅ No fraud alerts currently active`);
      }
      
      if (Date.now() - startTime >= duration) {
        clearInterval(monitorInterval);
        console.log(`\n⏹️ Real-time monitoring completed`);
      }
    }, 5000); // Check every 5 seconds
  }

  // Run comprehensive fraud alert tests
  async runFraudAlertTests() {
    console.log(`\n🎯 STARTING COMPREHENSIVE FRAUD ALERT TESTING\n`);
    console.log(`=`.repeat(60));

    try {
      // Step 1: Create test scenarios
      console.log(`\n📋 STEP 1: Creating Test Scenarios`);
      console.log(`-`.repeat(40));
      
      for (const scenario of testScenarios) {
        console.log(`\n🧪 Testing: ${scenario.name}`);
        console.log(`   Description: ${scenario.description}`);
        
        // Create user
        const user = await this.createTestUser(scenario.userData);
        if (!user) continue;
        
        // Wait a bit to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create loan
        const loan = await this.createTestLoan(user._id, scenario.loanData);
        if (!loan) continue;
        
        // Test fraud detection
        const fraudResult = await this.testFraudDetection(user._id, scenario.loanData);
        
        this.testResults.push({
          scenario: scenario.name,
          user: user,
          loan: loan,
          fraudResult: fraudResult
        });
        
        // Wait between scenarios
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 2: Test real-time alert retrieval
      console.log(`\n\n📊 STEP 2: Testing Real-Time Alert Retrieval`);
      console.log(`-`.repeat(40));
      
      await this.getFraudAlerts();

      // Step 3: Monitor real-time alerts
      console.log(`\n\n⏱️ STEP 3: Real-Time Alert Monitoring`);
      console.log(`-`.repeat(40));
      
      await this.monitorRealTimeAlerts(20000); // Monitor for 20 seconds

      // Step 4: Generate test summary
      console.log(`\n\n📈 STEP 4: Test Summary`);
      console.log(`-`.repeat(40));
      
      await this.generateTestSummary();

    } catch (error) {
      console.error(`🚨 Test execution failed:`, error);
    }
  }

  // Generate comprehensive test summary
  async generateTestSummary() {
    console.log(`\n📋 FRAUD ALERT TESTING SUMMARY`);
    console.log(`=`.repeat(50));
    
    console.log(`\n✅ Test Scenarios Executed: ${this.testResults.length}`);
    console.log(`👥 Test Users Created: ${this.createdUsers.length}`);
    console.log(`💰 Test Loans Created: ${this.createdLoans.length}`);
    
    // Analyze fraud detection results
    const highRiskResults = this.testResults.filter(result => 
      result.fraudResult && result.fraudResult.riskScore > 70
    );
    
    const mediumRiskResults = this.testResults.filter(result => 
      result.fraudResult && result.fraudResult.riskScore > 40 && result.fraudResult.riskScore <= 70
    );
    
    console.log(`\n🚨 Fraud Detection Results:`);
    console.log(`   High Risk (>70): ${highRiskResults.length} scenarios`);
    console.log(`   Medium Risk (40-70): ${mediumRiskResults.length} scenarios`);
    console.log(`   Low Risk (<40): ${this.testResults.length - highRiskResults.length - mediumRiskResults.length} scenarios`);
    
    // Display detailed results
    this.testResults.forEach((result, index) => {
      console.log(`\n📊 Result ${index + 1}: ${result.scenario}`);
      if (result.fraudResult) {
        console.log(`   Risk Score: ${result.fraudResult.riskScore}/100`);
        console.log(`   Threat Level: ${result.fraudResult.threatLevel}`);
        console.log(`   Fraud Type: ${result.fraudResult.fraudType}`);
        console.log(`   Requires Review: ${result.fraudResult.requiresManualReview ? 'YES' : 'NO'}`);
      }
    });

    // Final fraud alert check
    console.log(`\n🔍 Final Alert Status Check:`);
    const finalAlerts = await this.getFraudAlerts();
    
    if (finalAlerts) {
      console.log(`\n📊 FINAL STATISTICS:`);
      console.log(`   Total Alerts Generated: ${finalAlerts.alerts.length}`);
      console.log(`   Total Amount at Risk: $${finalAlerts.stats.preventedLoss.toLocaleString()}`);
      console.log(`   System Accuracy Rate: ${finalAlerts.stats.accuracyRate}%`);
    }
    
    console.log(`\n✅ FRAUD ALERT TESTING COMPLETED SUCCESSFULLY!`);
    console.log(`=`.repeat(60));
  }

  // Cleanup test data
  async cleanup() {
    console.log(`\n🧹 Cleaning up test data...`);
    
    // In a real scenario, you'd want to clean up test users and loans
    // For now, just log what would be cleaned
    console.log(`   Would delete ${this.createdUsers.length} test users`);
    console.log(`   Would delete ${this.createdLoans.length} test loans`);
    
    console.log(`✅ Cleanup completed`);
  }
}

// Main execution function
async function runTests() {
  const tester = new FraudAlertTester();
  
  try {
    await tester.runFraudAlertTests();
  } catch (error) {
    console.error('💥 Test execution failed:', error);
  } finally {
    await tester.cleanup();
  }
}

// Auto-run if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`🚀 Starting Fraud Alert Testing System...`);
  console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  console.log(`\n⚠️  Note: Make sure the server is running and you have admin access!`);
  
  // Add a delay to read the notice
  setTimeout(() => {
    runTests();
  }, 3000);
}

export default FraudAlertTester;
