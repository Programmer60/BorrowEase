#!/usr/bin/env node
// Migration script to backfill normalized spam scores and classifications.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ContactMessage from '../models/contactModel.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/borrowease';
  console.log('Connecting to', uri);
  await mongoose.connect(uri, { autoIndex: false });
  console.log('Connected');
  const start = Date.now();
  const results = await ContactMessage.recalculateNormalizedSpamScores();
  console.log('Recalculation complete:', results);
  console.log('Duration ms:', Date.now() - start);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
