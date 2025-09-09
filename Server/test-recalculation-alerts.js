#!/usr/bin/env node
import mongoose from 'mongoose';
import ContactMessage from './models/contactModel.js';
import PriorityIntelligenceService from './services/PriorityIntelligenceService.js';
import AdvancedSpamDetectionService from './services/advancedSpamDetection.js';

// Test the recalculation and alert system
async function testRecalculationAndAlerts() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/BorrowEase', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing High Spam Detection & Priority Recalculation...\n');

    // Create test messages with varying spam levels
    const testMessages = [
      {
        name: 'John Smith',
        email: 'john.smith@email.com',
        subject: 'Loan inquiry',
        message: 'I am interested in getting a personal loan for home renovation.',
        category: 'general',
        status: 'pending',
        priority: 'medium'
      },
      {
        name: 'Spam Bot 1',
        email: 'spam1@fake.com',
        subject: 'dvsfbfdbfbfbfv',
        message: 'ndcndjnmkcd dfvdfvdfv fbfgbfgbfgb',
        category: 'general',
        status: 'pending',
        priority: 'medium'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@verified.com',
        subject: 'Meeting Request',
        message: 'I would like to schedule a meeting to discuss my loan options.',
        category: 'general',
        status: 'pending',
        priority: 'medium'
      },
      {
        name: 'Ultra Spam',
        email: 'ultra@spam.fake',
        subject: 'aaaaaaaaaaa',
        message: 'zxczxczxc qweqweqwe asdasdasd ffffffff',
        category: 'general',
        status: 'pending',
        priority: 'medium'
      },
      {
        name: 'Premium User',
        email: 'premium@kycapproved.com',
        subject: 'Account Issue',
        message: 'I am having trouble accessing my account dashboard. Could you please help?',
        category: 'general',
        status: 'pending',
        priority: 'medium'
      }
    ];

    console.log('🗂️ Creating test messages...');
    
    for (let i = 0; i < testMessages.length; i++) {
      const messageData = testMessages[i];
      
      // Run spam detection
      const spamAnalysis = await AdvancedSpamDetectionService.analyzeMessage(messageData);
      console.log(`📧 Message ${i + 1}: "${messageData.subject}" - Spam Score: ${Math.round(spamAnalysis.spamScore * 100)}%`);
      
      // Run priority analysis
      const priorityAnalysis = await PriorityIntelligenceService.calculateIntelligentPriority(messageData);
      
      // Update message with analysis
      messageData.spamScore = spamAnalysis.spamScore;
      messageData.spamFlags = spamAnalysis.flags;
      messageData.riskLevel = spamAnalysis.riskLevel;
      messageData.priority = priorityAnalysis.finalPriority;
      messageData.priorityScore = priorityAnalysis.priorityScore;
      messageData.priorityFactors = priorityAnalysis.factors;
      messageData.priorityRecommendations = priorityAnalysis.recommendations;
      messageData.ipAddress = '127.0.0.1';
      messageData.userAgent = 'Test Agent';
      messageData.createdAt = new Date();

      const contactMessage = new ContactMessage(messageData);
      await contactMessage.save();
      console.log(`   ✅ Saved with Priority: ${priorityAnalysis.finalPriority.toUpperCase()} (Score: ${priorityAnalysis.priorityScore})`);
    }

    console.log('\n🎯 Testing Priority Recalculation...\n');
    
    // Test the recalculation function
    const recalcResults = await PriorityIntelligenceService.updateExistingMessagePriorities();
    
    console.log('📊 Recalculation Results:');
    console.log(`   Updated Messages: ${recalcResults.updated}`);
    console.log('   Priority Distribution:');
    console.log(`     🚨 Critical: ${recalcResults.priorityCounts.critical}`);
    console.log(`     ⚡ High: ${recalcResults.priorityCounts.high}`);
    console.log(`     📋 Medium: ${recalcResults.priorityCounts.medium}`);
    console.log(`     📝 Low: ${recalcResults.priorityCounts.low}`);
    console.log(`     ⬇️  Very Low: ${recalcResults.priorityCounts.very_low}`);

    console.log('\n🚨 Checking for High Spam Alerts...\n');
    
    // Find messages with high spam rates
    const highSpamMessages = await ContactMessage.find({
      spamScore: { $gt: 1.0 }  // Over 100% spam
    });

    console.log(`⚠️  HIGH SPAM ALERT: ${highSpamMessages.length} messages have spam rates over 100%!`);
    
    highSpamMessages.forEach((msg, index) => {
      const spamPercentage = Math.round(msg.spamScore * 100);
      console.log(`   ${index + 1}. "${msg.subject}" - ${spamPercentage}% spam (${msg.riskLevel} risk)`);
    });

    if (highSpamMessages.length > 0) {
      const maxSpam = Math.max(...highSpamMessages.map(m => Math.round(m.spamScore * 100)));
      console.log(`\n🔥 Highest spam rate detected: ${maxSpam}%`);
    }

    console.log('\n✅ Test completed successfully!\n');
    
    console.log('🎯 Summary:');
    console.log(`   - Created ${testMessages.length} test messages`);
    console.log(`   - Detected ${highSpamMessages.length} high spam messages`);
    console.log(`   - Recalculated ${recalcResults.updated} message priorities`);
    console.log(`   - Alert system would trigger for ${highSpamMessages.length} messages`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testRecalculationAndAlerts();
