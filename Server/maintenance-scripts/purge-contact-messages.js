#!/usr/bin/env node
// Utility to purge legacy contact messages causing inflated spam metrics.
// Modes:
//  --all : delete ALL contact messages
//  --legacy : delete only messages where spamScore > 1 (raw stored) OR spamScoreRaw > 100
//  --before=YYYY-MM-DD : additionally filter by createdAt earlier than date
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ContactMessage from '../models/contactModel.js';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { all:false, legacy:false, before:null };
  args.forEach(a => {
    if (a === '--all') opts.all = true;
    else if (a === '--legacy') opts.legacy = true;
    else if (a.startsWith('--before=')) opts.before = new Date(a.split('=')[1]);
  });
  if (!opts.all && !opts.legacy) opts.legacy = true; // default safe mode
  return opts;
}

async function run() {
  const opts = parseArgs();
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/borrowease';
  console.log('Connecting to', uri);
  await mongoose.connect(uri, { autoIndex:false });
  const filter = {};
  if (opts.legacy) {
    filter.$or = [ { spamScore: { $gt: 1 } }, { spamScoreRaw: { $gt: 100 } } ];
  }
  if (opts.before) {
    filter.createdAt = { $lt: opts.before };
  }
  if (opts.all) {
    Object.keys(filter).forEach(k=> delete filter[k]);
  }
  const count = await ContactMessage.countDocuments(filter);
  if (count === 0) {
    console.log('No matching messages to delete. Filter:', filter);
    process.exit(0);
  }
  console.log('Deleting', count, 'messages with filter', filter);
  const res = await ContactMessage.deleteMany(filter);
  console.log('Deleted', res.deletedCount, 'messages.');
  await mongoose.disconnect();
}

run().catch(e=>{ console.error(e); process.exit(1); });
