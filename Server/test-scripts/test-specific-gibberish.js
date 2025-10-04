// Quick test for the specific gibberish message "ndcndjnmkcd"
import { AdvancedSpamDetectionService } from './services/advancedSpamDetection.js';

const testSpecificMessage = async () => {
  console.log('🔍 Testing specific message: "ndcndjnmkcd"\n');

  const messageData = {
    name: 'Shivam Mishra',
    email: 'mishrashivam7465@gmail.com',
    subject: 'vjdjvndsvn', // Subject is also gibberish
    message: 'ndcndjnmkcd',
    category: 'general'
  };

  try {
    // Test the detection
    const gibberishResult = AdvancedSpamDetectionService.detectGibberish(messageData.message);
    const subjectGibberish = AdvancedSpamDetectionService.detectGibberish(messageData.subject);
    const meaningfulness = AdvancedSpamDetectionService.assessMessageMeaningfulness(messageData.message);
    
    console.log('📊 Individual Analysis:');
    console.log(`  Message: "${messageData.message}"`);
    console.log(`  Subject: "${messageData.subject}"`);
    console.log(`  Message Gibberish Score: ${Math.round(gibberishResult.score * 100)}%`);
    console.log(`  Subject Gibberish Score: ${Math.round(subjectGibberish.score * 100)}%`);
    console.log(`  Meaningfulness: ${Math.round(meaningfulness * 100)}%`);
    console.log(`  Gibberish Reasons: ${gibberishResult.reasons.join(', ')}`);

    // Simulate full analysis (without database call)
    let totalSpamScore = 0;
    let flags = [];
    
    // Add gibberish scores
    totalSpamScore += gibberishResult.score * 70; // Message gibberish
    totalSpamScore += subjectGibberish.score * 50; // Subject gibberish
    flags.push(...gibberishResult.reasons);
    flags.push(...subjectGibberish.reasons);
    
    // Add meaningfulness penalty
    if (messageData.message.length < 50 && meaningfulness < 0.3) {
      totalSpamScore += 60;
      flags.push('Message appears to be meaningless gibberish');
    }

    // Determine risk level and actions
    let riskLevel = 'low';
    let autoActions = [];
    
    if (totalSpamScore >= 80) {
      riskLevel = 'critical';
      autoActions.push('auto_block');
    } else if (totalSpamScore >= 50) {
      riskLevel = 'high';
      autoActions.push('quarantine');
    } else if (totalSpamScore >= 25) {
      riskLevel = 'medium';
      autoActions.push('flag_review');
    }

    console.log('\n🎯 Final Analysis:');
    console.log(`  Total Spam Score: ${Math.round(totalSpamScore)}`);
    console.log(`  Risk Level: ${riskLevel}`);
    console.log(`  Auto Actions: ${autoActions.join(', ') || 'None'}`);
    console.log(`  Should be visible to admin: ${autoActions.includes('quarantine') || autoActions.includes('auto_block') ? '❌ NO (QUARANTINED)' : '✅ YES'}`);
    console.log(`  All Flags: ${flags.join(', ')}`);

    console.log('\n🚨 CONCLUSION:');
    if (totalSpamScore >= 50) {
      console.log('✅ This message SHOULD BE quarantined and hidden from admin!');
      console.log('🔧 If it\'s still showing, there\'s an integration issue.');
    } else {
      console.log('❌ This message would NOT be quarantined - need to adjust thresholds.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testSpecificMessage();
