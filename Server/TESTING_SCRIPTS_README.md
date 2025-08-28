# 🧪 BorrowEase Testing Scripts

This directory contains several scripts to help you test the email verification and authentication system by managing test users.

## 📁 Available Scripts

### 1. **`delete-user-by-email.js`** - Basic User Deletion
```bash
node delete-user-by-email.js <email>
```

**What it does:**
- Deletes user from Firebase Authentication
- Deletes user from MongoDB database
- Shows detailed status for each operation

**Example:**
```bash
node delete-user-by-email.js bt21cse012@nituk.ac.in
```

---

### 2. **`cleanup-user-complete.js`** - Advanced Cleanup
```bash
node cleanup-user-complete.js <email> [--complete]
```

**What it does:**
- Basic: Firebase + MongoDB user deletion
- Complete: Also deletes KYC, loans, chats, notifications

**Examples:**
```bash
# Basic cleanup
node cleanup-user-complete.js bt21cse012@nituk.ac.in

# Complete cleanup (all related data)
node cleanup-user-complete.js bt21cse012@nituk.ac.in --complete
```

---

### 3. **`quick-test-reset.js`** - Quick Testing Tool
```bash
node quick-test-reset.js [option] [email]
```

**Options:**
- `1` - Delete bt21cse012@nituk.ac.in (default)
- `2` - Delete all test emails
- `3` - List all users in database
- `4 <email>` - Delete custom email

**Examples:**
```bash
node quick-test-reset.js              # Delete bt21cse012@nituk.ac.in
node quick-test-reset.js 2            # Clean all test users
node quick-test-reset.js 3            # List all users
node quick-test-reset.js 4 test@example.com  # Delete custom email
```

---

### 4. **`test-user.bat`** - Windows Batch File (Easiest!)
```cmd
test-user.bat <command> [email]
```

**Commands:**
- `reset` - Reset bt21cse012@nituk.ac.in
- `delete <email>` - Delete specific user
- `list` - List all users
- `clean` - Delete all test users

**Examples:**
```cmd
test-user.bat reset                    # Quick reset
test-user.bat delete test@example.com  # Delete specific user
test-user.bat list                     # Show all users
test-user.bat clean                    # Clean all test data
```

## 🚀 Testing Workflow

### For Email Verification Testing:

1. **Sign up** with test email (e.g., bt21cse012@nituk.ac.in)
2. **Test the flow** (verification email, login attempts, etc.)
3. **Reset user** when you want to test again:
   ```cmd
   test-user.bat reset
   ```
4. **Repeat** as many times as needed!

### For Different Email Addresses:

1. **Use any email** for testing
2. **Delete when done**:
   ```cmd
   test-user.bat delete your-test@email.com
   ```

## 📋 Output Examples

### Successful Deletion:
```
🔍 Starting deletion process for email: bt21cse012@nituk.ac.in
✅ Connected to MongoDB
🔥 Step 1: Deleting from Firebase Authentication...
👤 Found Firebase user: bt21cse012@nituk.ac.in (UID: abc123...)
✅ Successfully deleted user from Firebase Authentication
🗄️ Step 2: Deleting from MongoDB...
👤 Found MongoDB user: bt21cse012@nituk.ac.in (ID: 507f1f77...)
   Role: borrower
   Verified: true
✅ Successfully deleted user from MongoDB

📋 DELETION SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: bt21cse012@nituk.ac.in
🔥 Firebase: ✅ Deleted
🗄️ MongoDB: ✅ Deleted

🎉 User cleanup completed! You can now test signup/login again.
```

### User Not Found:
```
⚠️ User not found in Firebase Authentication
⚠️ User not found in MongoDB

📋 DELETION SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: nonexistent@email.com
🔥 Firebase: ❌ Failed/Not Found
🗄️ MongoDB: ❌ Failed/Not Found

⚠️ No user data found to delete.
```

## 🔧 Setup Requirements

Make sure these are installed:
- Node.js
- Firebase Admin SDK configured
- MongoDB connection working
- All dependencies installed (`npm install`)

## ⚠️ Important Notes

1. **Use only for testing** - These scripts permanently delete user data
2. **Backup important data** before using complete cleanup
3. **Check Firebase console** to verify deletion
4. **These scripts work with your current Firebase project** configured in `serviceAccountKey.json`

## 🎯 Quick Start

For the fastest testing experience:

```cmd
# Windows users (easiest)
test-user.bat reset

# All platforms
node delete-user-by-email.js bt21cse012@nituk.ac.in
```

Now you can test email verification and signup flows as many times as needed! 🚀
