/**
 * Delete User by Email - Testing Script
 * 
 * This script allows you to delete a user from both Firebase Authentication
 * and MongoDB database by email address. Useful for testing email verification
 * and signup flows repeatedly.
 * 
 * Usage:
 * node delete-user-by-email.js <email>
 * 
 * Example:
 * node delete-user-by-email.js bt21cse012@nituk.ac.in
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

async function deleteUserByEmail(email) {
    if (!email) {
        console.log('❌ Please provide an email address');
        console.log('Usage: node delete-user-by-email.js <email>');
        process.exit(1);
    }

    console.log(`🔍 Starting deletion process for email: ${email}`);
    
    try {
        // Connect to database
        await connectDB();
        console.log('✅ Connected to MongoDB');

        let deletedFromFirebase = false;
        let deletedFromMongoDB = false;
        let firebaseError = null;
        let mongoError = null;

        // Step 1: Delete from Firebase Authentication
        try {
            console.log('🔥 Step 1: Deleting from Firebase Authentication...');
            
            // First, try to find the user by email
            const userRecord = await auth.getUserByEmail(email);
            console.log(`👤 Found Firebase user: ${userRecord.email} (UID: ${userRecord.uid})`);
            
            // Delete the user
            await auth.deleteUser(userRecord.uid);
            console.log('✅ Successfully deleted user from Firebase Authentication');
            deletedFromFirebase = true;
            
        } catch (error) {
            firebaseError = error;
            if (error.code === 'auth/user-not-found') {
                console.log('⚠️  User not found in Firebase Authentication');
            } else {
                console.log('❌ Error deleting from Firebase:', error.message);
            }
        }

        // Step 2: Delete from MongoDB
        try {
            console.log('🗄️  Step 2: Deleting from MongoDB...');
            
            const mongoUser = await User.findOne({ email });
            
            if (mongoUser) {
                console.log(`👤 Found MongoDB user: ${mongoUser.email} (ID: ${mongoUser._id})`);
                console.log(`   Role: ${mongoUser.role}`);
                console.log(`   Verified: ${mongoUser.verified}`);
                console.log(`   Firebase UIDs: ${mongoUser.firebaseUids}`);
                
                await User.deleteOne({ email });
                console.log('✅ Successfully deleted user from MongoDB');
                deletedFromMongoDB = true;
            } else {
                console.log('⚠️  User not found in MongoDB');
            }
            
        } catch (error) {
            mongoError = error;
            console.log('❌ Error deleting from MongoDB:', error.message);
        }

        // Step 3: Summary
        console.log('\n📋 DELETION SUMMARY:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email: ${email}`);
        console.log(`🔥 Firebase: ${deletedFromFirebase ? '✅ Deleted' : '❌ Failed/Not Found'}`);
        console.log(`🗄️  MongoDB: ${deletedFromMongoDB ? '✅ Deleted' : '❌ Failed/Not Found'}`);
        
        if (firebaseError && firebaseError.code !== 'auth/user-not-found') {
            console.log(`🔥 Firebase Error: ${firebaseError.message}`);
        }
        
        if (mongoError) {
            console.log(`🗄️  MongoDB Error: ${mongoError.message}`);
        }
        
        if (deletedFromFirebase || deletedFromMongoDB) {
            console.log('\n🎉 User cleanup completed! You can now test signup/login again.');
        } else {
            console.log('\n⚠️  No user data found to delete.');
        }
        
    } catch (error) {
        console.error('🚨 Unexpected error:', error);
    } finally {
        process.exit(0);
    }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.log('❌ Please provide an email address');
    console.log('Usage: node delete-user-by-email.js <email>');
    console.log('\nExample:');
    console.log('node delete-user-by-email.js bt21cse012@nituk.ac.in');
    process.exit(1);
}

// Run the deletion
deleteUserByEmail(email);
