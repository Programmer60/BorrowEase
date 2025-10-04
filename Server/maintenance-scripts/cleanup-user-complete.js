/**
 * Advanced User Cleanup Script
 * 
 * This script performs a complete cleanup of user data including:
 * - Firebase Authentication
 * - MongoDB User record
 * - Related KYC data
 * - Chat messages
 * - Loan applications
 * - Notifications
 * 
 * Usage:
 * node cleanup-user-complete.js <email>
 */

import admin from "firebase-admin";
import { createRequire } from "module";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";
import dotenv from "dotenv";

// Import other models
let KYC, ChatMessage, Loan, Notification;

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

async function loadModels() {
    try {
        const kycModule = await import("./models/kycModel.js");
        KYC = kycModule.default;
        
        const chatModule = await import("./models/chatModel.js");
        ChatMessage = chatModule.default;
        
        const loanModule = await import("./models/loanModel.js");
        Loan = loanModule.default;
        
        const notificationModule = await import("./models/notificationModel.js");
        Notification = notificationModule.default;
        
        console.log('✅ All models loaded successfully');
    } catch (error) {
        console.log('⚠️  Some models could not be loaded:', error.message);
    }
}

async function completeUserCleanup(email, includeRelatedData = false) {
    if (!email) {
        console.log('❌ Please provide an email address');
        process.exit(1);
    }

    console.log(`🧹 Starting COMPLETE cleanup for email: ${email}`);
    console.log(`🔄 Include related data: ${includeRelatedData ? 'YES' : 'NO'}`);
    
    try {
        // Connect to database
        await connectDB();
        await loadModels();
        console.log('✅ Connected to MongoDB');

        // First, get user info for related data cleanup
        const mongoUser = await User.findOne({ email });
        let userId = null;
        
        if (mongoUser) {
            userId = mongoUser._id;
            console.log(`👤 Found user in MongoDB: ${mongoUser.email}`);
            console.log(`   User ID: ${userId}`);
            console.log(`   Role: ${mongoUser.role}`);
            console.log(`   Verified: ${mongoUser.verified}`);
        }

        let summary = {
            firebase: false,
            mongodb: false,
            kyc: 0,
            loans: 0,
            chats: 0,
            notifications: 0,
            errors: []
        };

        // Step 1: Delete from Firebase Authentication
        try {
            console.log('\n🔥 Step 1: Firebase Authentication cleanup...');
            const userRecord = await auth.getUserByEmail(email);
            await auth.deleteUser(userRecord.uid);
            console.log('✅ Deleted from Firebase Authentication');
            summary.firebase = true;
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('⚠️  User not found in Firebase');
            } else {
                console.log('❌ Firebase error:', error.message);
                summary.errors.push(`Firebase: ${error.message}`);
            }
        }

        // Step 2: Delete related data (if requested and user exists)
        if (includeRelatedData && userId) {
            console.log('\n🗑️  Step 2: Cleaning up related data...');
            
            // Delete KYC data
            if (KYC) {
                try {
                    const kycResult = await KYC.deleteMany({ userId });
                    summary.kyc = kycResult.deletedCount;
                    console.log(`✅ Deleted ${kycResult.deletedCount} KYC record(s)`);
                } catch (error) {
                    console.log('❌ KYC cleanup error:', error.message);
                    summary.errors.push(`KYC: ${error.message}`);
                }
            }

            // Delete loan applications
            if (Loan) {
                try {
                    const loanResult = await Loan.deleteMany({ 
                        $or: [
                            { borrowerId: userId },
                            { lenderId: userId }
                        ]
                    });
                    summary.loans = loanResult.deletedCount;
                    console.log(`✅ Deleted ${loanResult.deletedCount} loan record(s)`);
                } catch (error) {
                    console.log('❌ Loan cleanup error:', error.message);
                    summary.errors.push(`Loans: ${error.message}`);
                }
            }

            // Delete chat messages
            if (ChatMessage) {
                try {
                    const chatResult = await ChatMessage.deleteMany({ 
                        $or: [
                            { senderId: userId },
                            { receiverId: userId }
                        ]
                    });
                    summary.chats = chatResult.deletedCount;
                    console.log(`✅ Deleted ${chatResult.deletedCount} chat message(s)`);
                } catch (error) {
                    console.log('❌ Chat cleanup error:', error.message);
                    summary.errors.push(`Chats: ${error.message}`);
                }
            }

            // Delete notifications
            if (Notification) {
                try {
                    const notifResult = await Notification.deleteMany({ 
                        $or: [
                            { userId: userId },
                            { senderId: userId }
                        ]
                    });
                    summary.notifications = notifResult.deletedCount;
                    console.log(`✅ Deleted ${notifResult.deletedCount} notification(s)`);
                } catch (error) {
                    console.log('❌ Notification cleanup error:', error.message);
                    summary.errors.push(`Notifications: ${error.message}`);
                }
            }
        }

        // Step 3: Delete user from MongoDB
        try {
            console.log('\n🗄️  Step 3: MongoDB User cleanup...');
            if (mongoUser) {
                await User.deleteOne({ email });
                console.log('✅ Deleted user from MongoDB');
                summary.mongodb = true;
            } else {
                console.log('⚠️  User not found in MongoDB');
            }
        } catch (error) {
            console.log('❌ MongoDB error:', error.message);
            summary.errors.push(`MongoDB: ${error.message}`);
        }

        // Step 4: Final Summary
        console.log('\n📋 COMPLETE CLEANUP SUMMARY:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email: ${email}`);
        console.log(`🔥 Firebase Auth: ${summary.firebase ? '✅ Deleted' : '❌ Failed/Not Found'}`);
        console.log(`🗄️  MongoDB User: ${summary.mongodb ? '✅ Deleted' : '❌ Failed/Not Found'}`);
        
        if (includeRelatedData) {
            console.log(`📋 KYC Records: ${summary.kyc} deleted`);
            console.log(`💳 Loan Records: ${summary.loans} deleted`);
            console.log(`💬 Chat Messages: ${summary.chats} deleted`);
            console.log(`🔔 Notifications: ${summary.notifications} deleted`);
        }
        
        if (summary.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            summary.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        console.log('\n🎉 Cleanup completed! User can now be recreated for testing.');
        
    } catch (error) {
        console.error('🚨 Unexpected error:', error);
    } finally {
        process.exit(0);
    }
}

// Parse command line arguments
const email = process.argv[2];
const includeRelatedData = process.argv[3] === '--complete' || process.argv[3] === '-c';

if (!email) {
    console.log('❌ Please provide an email address');
    console.log('\nUsage:');
    console.log('  node cleanup-user-complete.js <email>                    # Basic cleanup');
    console.log('  node cleanup-user-complete.js <email> --complete        # Complete cleanup');
    console.log('\nExamples:');
    console.log('  node cleanup-user-complete.js bt21cse012@nituk.ac.in');
    console.log('  node cleanup-user-complete.js bt21cse012@nituk.ac.in --complete');
    process.exit(1);
}

// Run the cleanup
completeUserCleanup(email, includeRelatedData);
