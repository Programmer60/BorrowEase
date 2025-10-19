/**
 * Start script that runs both the main server and email worker
 * This allows running the email worker for FREE on Render without needing a separate Background Worker service
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting BorrowEase with Email Worker...\n');

// Start the main server
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env }
});

// Start the email worker
const emailWorker = spawn('node', ['./workers/emailWorker.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env }
});

// Handle server exit
server.on('exit', (code) => {
  console.log(`\n❌ Server process exited with code ${code}`);
  emailWorker.kill();
  process.exit(code);
});

// Handle email worker exit
emailWorker.on('exit', (code) => {
  console.log(`\n❌ Email worker process exited with code ${code}`);
  // Don't kill server if email worker crashes, just log it
  console.log('⚠️  Server continues running, but emails won\'t be sent');
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
  emailWorker.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
  emailWorker.kill('SIGINT');
});

console.log('✅ Both processes started successfully');
console.log('📧 Email Worker: Running in background');
console.log('🌐 Web Server: Starting...\n');
