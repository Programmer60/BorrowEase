#!/usr/bin/env node

/**
 * Pre-deployment validation script for BorrowEase
 * This script checks if all required environment variables are set before deployment
 */

console.log('🔍 BorrowEase Pre-Deployment Validation\n');

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET',
  'VITE_API_BASE_URL',
  'VITE_SOCKET_URL'
];

let missingVars = [];
let validationPassed = true;

console.log('📋 Checking required environment variables...\n');

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  const hasValue = value && value.trim() !== '';
  
  console.log(`${hasValue ? '✅' : '❌'} ${varName}: ${hasValue ? 'SET' : 'MISSING'}`);
  
  if (!hasValue) {
    missingVars.push(varName);
    validationPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (validationPassed) {
  console.log('✅ All environment variables are set!');
  console.log('🚀 Deployment can proceed.');
} else {
  console.log(`❌ ${missingVars.length} environment variable(s) missing:`);
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📚 Please refer to VERCEL_DEPLOYMENT_GUIDE.md for setup instructions.');
  console.log('🚨 DO NOT DEPLOY until all variables are configured!');
  process.exit(1);
}

// Additional validations
console.log('\n🔍 Additional validations...');

// Check if API URL looks valid
const apiUrl = process.env.VITE_API_BASE_URL;
if (apiUrl && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
  console.log('⚠️  WARNING: API URL points to localhost - update for production!');
}

// Check if Socket URL looks valid  
const socketUrl = process.env.VITE_SOCKET_URL;
if (socketUrl && (socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1'))) {
  console.log('⚠️  WARNING: Socket URL points to localhost - update for production!');
}

console.log('\n✨ Validation complete!');