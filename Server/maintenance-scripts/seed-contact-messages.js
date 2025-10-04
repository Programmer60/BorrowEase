#!/usr/bin/env node
// Seed diverse ContactMessage documents to exercise admin UI sections
// Usage: node Server/scripts/seed-contact-messages.js [--count 30]
// Requires MONGODB_URI in env (dotenv) and existing User with role=admin for assignment tests (optional)

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ContactMessage from '../models/contactModel.js';
import User from '../models/userModel.js';
import AdvancedSpamDetectionService from '../services/advancedSpamDetection.js';
import { AutoResponseService } from '../services/autoResponseService.js';
import PriorityIntelligenceService from '../services/PriorityIntelligenceService.js';

dotenv.config();

const TOTAL = parseInt(process.argv.find(a => a.startsWith('--count='))?.split('=')[1] || process.argv[2] || '24', 10);

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

const categories = ['general','technical','account','security','billing','feedback','complaint'];
const baseSubjects = [
  'Need help with account',
  'Payment issue',
  'Loan approval status',
  'Security concern',
  'Feature feedback',
  'Broken page report',
  'Password reset problem',
  'Billing discrepancy',
  'Bug: form not submitting',
  'KYC verification question'
];

// Messages that should trigger auto-response (keywords from AutoResponseService templates)
const autoRespMessages = [
  'Hi, I forgot my password and need a password reset link',
  'How can I verify my email and complete KYC process?',
  'Question about interest rates and repayment schedule',
  'Need help updating account details and changing email'
];

// High spam style gibberish / link heavy messages
const spammy = [
  'FREE $$$ CLICK http://spam.example.com now now now!!!',
  'win big WIN BIG WIN BIG visit http://bad.example xyz',
  '!!!!!! #### $$$$ random characters $$$$ #### !!!!!',
  'cheap loans!!! http://loans.fake offer limited limited'
];

// Neutral / low risk messages
const normals = [
  'I would like to know my current loan status please.',
  'Just sharing some feedback about the UI speed.',
  'Can you clarify the early repayment policy?',
  'Thanks for the quick support last time.'
];

async function main(){
  console.log('🔌 Connecting to Mongo...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/borowease');
  console.log('✅ Connected');

  const adminUser = await User.findOne({ role: 'admin' });
  if (adminUser) console.log('👤 Found admin user for assignment tests:', adminUser.email);
  else console.log('⚠️ No admin user found; assignedTo tests will be skipped');

  const docs = [];

  // Strategy: create groups for each scenario
  const scenarios = [];

  // 1. Auto-response candidates
  autoRespMessages.forEach(m => scenarios.push({ type: 'auto', message: m }));

  // 2. High spam raw messages
  spammy.forEach(m => scenarios.push({ type: 'spam', message: m }));

  // 3. Normal messages
  normals.forEach(m => scenarios.push({ type: 'normal', message: m }));

  // Expand until TOTAL
  while (scenarios.length < TOTAL) {
    scenarios.push({ type: pick(['auto','spam','normal']), message: pick([...autoRespMessages, ...spammy, ...normals]) });
  }

  let created = 0;
  for (const sc of scenarios.slice(0, TOTAL)) {
    const subject = pick(baseSubjects);
    const category = pick(categories);

    // Base data
    const base = {
      name: 'Seed User',
      email: `seed${created}@example.com`,
      subject: subject + (sc.type === 'spam' ? ' !!!' : ''),
      message: sc.message,
      category,
      status: 'pending',
      priority: 'medium',
      ipAddress: '127.0.0.1',
      userAgent: 'SeederScript/1.0'
    };

    // Spam detection
    const spamAnalysis = await AdvancedSpamDetectionService.analyzeMessage(base);
    base.spamScoreRaw = spamAnalysis.spamScoreRaw;
    base.spamScore = spamAnalysis.spamScore;
    base.spamScoreNormalized = spamAnalysis.spamScore;
    base.spamFlags = spamAnalysis.flags;
    base.riskLevel = spamAnalysis.riskLevel;
    base.requiresReview = spamAnalysis.riskLevel !== 'low';

    // Priority intelligence
    const priorityAnalysis = await PriorityIntelligenceService.calculateIntelligentPriority(base).catch(()=>({finalPriority:'medium',priorityScore:0,factors:[],recommendations:[]}));
    base.priority = priorityAnalysis.finalPriority;
    base.priorityScore = priorityAnalysis.priorityScore;
    base.priorityFactors = priorityAnalysis.factors;
    base.priorityRecommendations = priorityAnalysis.recommendations;

    // Auto response test (simulate what submit route does)
    const autoResp = await AutoResponseService.analyzeAndRespond(base);
    if (autoResp.shouldAutoRespond) {
      base.autoResponseSent = true;
      base.autoResponseMeta = { template: autoResp.matchedTemplate, confidence: autoResp.confidence, respondedAt: new Date() };
      // We do NOT push a response message here to keep script fast.
    }

    const doc = new ContactMessage(base);
    await doc.save();

    // Optional: simulate some resolved / assigned / quarantined states for coverage
    if (adminUser && created % 6 === 0) {
      doc.assignedTo = adminUser._id;
      doc.status = 'in_progress';
      await doc.save();
    } else if (created % 7 === 0) {
      doc.status = 'quarantined';
      await doc.save();
    } else if (created % 9 === 0) {
      doc.status = 'resolved';
      doc.resolvedBy = adminUser?._id;
      doc.resolvedAt = new Date();
      await doc.save();
    }

    created++;
  }

  console.log(`✅ Seeded ${created} contact messages.`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

main().catch(e => { console.error('❌ Seed failed', e); process.exit(1); });
