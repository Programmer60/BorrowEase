/**
 * Quick Test User Reset
 * 
 * Pre-configured script for quick testing with common test emails
 */

import admin from "firebase-admin";
import { createRequire } from "module";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const auth = admin.auth();

const TEST_EMAILS = [
    'bt21cse012@nituk.ac.in',
    'test@example.com',
    'demo@borrowease.com',
    'student@test.com'
];

async function quickReset() {
    console.log('🧪 QUICK TEST USER RESET');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        await connectDB();
        console.log('✅ Connected to database');
        
        console.log('\nChoose an option:');
        console.log('1. Delete bt21cse012@nituk.ac.in');
        console.log('2. Delete all test emails');
        console.log('3. List all users in database');
        console.log('4. Delete custom email');
        
        const option = process.argv[2] || '1';
        
        switch(option) {
            case '1':
                await deleteUser('bt21cse012@nituk.ac.in');
                break;
            case '2':
                for (const email of TEST_EMAILS) {
                    await deleteUser(email);
                }
                break;
            case '3':
                await listAllUsers();
                break;
            case '4':
                const customEmail = process.argv[3];
                if (customEmail) {
                    await deleteUser(customEmail);
                } else {
                    console.log('❌ Please provide email: node quick-test-reset.js 4 <email>');
                }
                break;
            default:
                await deleteUser('bt21cse012@nituk.ac.in');
        }
        
    } catch (error) {
        console.error('🚨 Error:', error);
    } finally {
        process.exit(0);
    }
}

async function deleteUser(email) {
    console.log(`\n🗑️  Deleting: ${email}`);
    
    // Firebase cleanup
    try {
        const userRecord = await auth.getUserByEmail(email);
        await auth.deleteUser(userRecord.uid);
        console.log('  ✅ Firebase: Deleted');
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log('  ⚠️  Firebase: Not found');
        } else {
            console.log('  ❌ Firebase: Error -', error.message);
        }
    }
    
    // MongoDB cleanup
    try {
        const result = await User.deleteOne({ email });
        if (result.deletedCount > 0) {
            console.log('  ✅ MongoDB: Deleted');
        } else {
            console.log('  ⚠️  MongoDB: Not found');
        }
    } catch (error) {
        console.log('  ❌ MongoDB: Error -', error.message);
    }
}

async function listAllUsers() {
    console.log('\n👥 ALL USERS IN DATABASE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const users = await User.find({}, 'email role verified createdAt').sort({ createdAt: -1 });
        
        if (users.length === 0) {
            console.log('No users found in database');
        } else {
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Verified: ${user.verified ? '✅' : '❌'}`);
                console.log(`   Created: ${user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'}`);
                console.log('');
            });
        }
    } catch (error) {
        console.log('❌ Error listing users:', error.message);
    }
}

// Show usage if no arguments
if (process.argv.length === 2) {
    console.log('🧪 Quick Test User Reset');
    console.log('\nUsage:');
    console.log('  node quick-test-reset.js 1                    # Delete bt21cse012@nituk.ac.in');
    console.log('  node quick-test-reset.js 2                    # Delete all test emails');
    console.log('  node quick-test-reset.js 3                    # List all users');
    console.log('  node quick-test-reset.js 4 <email>            # Delete custom email');
    console.log('\nQuick commands:');
    console.log('  node quick-test-reset.js                      # Default: delete bt21cse012@nituk.ac.in');
}

quickReset();
