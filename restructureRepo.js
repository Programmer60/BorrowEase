#!/usr/bin/env node
/**
 * Repository Restructuring Script
 * Moves: 
 *  - All root .md files (except README.md, MODEL_VARIANTS.md) -> docs/
 *  - Test / debug scripts -> Server/test-scripts/
 *  - Maintenance / cleanup / seed scripts -> Server/maintenance-scripts/
 *  - Moves batch script test-user.bat into test-scripts.
 * Safe: Skips files that are already moved or missing.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve('.');
const docsDir = path.join(root, 'docs');
const serverDir = path.join(root, 'Server');
const testScriptsDir = path.join(serverDir, 'test-scripts');
const maintScriptsDir = path.join(serverDir, 'maintenance-scripts');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
ensureDir(docsDir); ensureDir(testScriptsDir); ensureDir(maintScriptsDir);

// Root markdown movement
const keepAtRoot = new Set(['README.md','MODEL_VARIANTS.md']);
const rootFiles = fs.readdirSync(root);
const mdToMove = rootFiles.filter(f => f.toLowerCase().endsWith('.md') && !keepAtRoot.has(f));

// Categorize server scripts
const serverRootFiles = fs.readdirSync(serverDir);
const scriptsFolder = path.join(serverDir,'scripts');
let scriptsFolderFiles = [];
try { scriptsFolderFiles = fs.readdirSync(scriptsFolder); } catch {}

const testPatterns = [
  /^test/i, /^debug/i, /^create-test/i, /^full-kyc-test/i,
  /^admin-contact-viewer/i, /^check-user-names/i, /^checkAdmin/i, /^exploreDB/i
];
const maintenancePatterns = [
  /^cleanup/i, /^delete-user/i, /^fixKYCStatus/i, /^makeAdmin/i,
  /^populate-test-data/i, /^quick-test-reset/i, /^updateLoanStatuses/i,
  /^seed-contact-messages/i, /^purge-contact-messages/i, /^migrate-normalize-spam-scores/i
];

function classify(name){
  if(testPatterns.some(r=>r.test(name))) return 'test';
  if(maintenancePatterns.some(r=>r.test(name))) return 'maint';
  return null;
}

const moves = [];
// Root .md moves
mdToMove.forEach(f=>{
  moves.push({from:path.join(root,f), to:path.join(docsDir,f), type:'doc'});
});

// Server root js scripts
serverRootFiles.forEach(f=>{
  if(!f.endsWith('.js') && !f.endsWith('.cjs') && !f.endsWith('.bat')) return;
  const cls = classify(f);
  if(cls==='test') moves.push({from:path.join(serverDir,f), to:path.join(testScriptsDir,f), type:'script'});
  else if(cls==='maint') moves.push({from:path.join(serverDir,f), to:path.join(maintScriptsDir,f), type:'script'});
});

// scripts folder contents
scriptsFolderFiles.forEach(f=>{
  const cls = classify(f);
  if(cls==='test') moves.push({from:path.join(scriptsFolder,f), to:path.join(testScriptsDir,f), type:'script'});
  else if(cls==='maint') moves.push({from:path.join(scriptsFolder,f), to:path.join(maintScriptsDir,f), type:'script'});
});

// test-user.bat
if(serverRootFiles.includes('test-user.bat')) {
  moves.push({from:path.join(serverDir,'test-user.bat'), to:path.join(testScriptsDir,'test-user.bat'), type:'script'});
}

let moved=0; let skipped=0;
for(const m of moves){
  try {
    if(!fs.existsSync(m.from)) { skipped++; continue; }
    if(fs.existsSync(m.to)) { skipped++; continue; }
    fs.renameSync(m.from, m.to);
    moved++;
    console.log('Moved', path.relative(root,m.from),'->', path.relative(root,m.to));
  } catch (e) {
    console.warn('Failed to move', m.from, '->', m.to, e.message);
  }
}

// Generate docs/INDEX.md listing moved docs
const indexPath = path.join(docsDir,'INDEX.md');
const docList = mdToMove.map(f=>`- [${f}](./${f})`).join('\n');
fs.writeFileSync(indexPath,`# Documentation Index\n\nThe following documents were reorganized on ${new Date().toISOString()}\n\n${docList}\n`);

console.log(`\nSummary: moved ${moved} items, skipped ${skipped}.`);
console.log('Keep root docs:', Array.from(keepAtRoot).join(', '));
