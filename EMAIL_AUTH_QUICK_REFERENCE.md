# 🚀 Email Authentication Quick Reference Guide

## 📋 Quick Commands

### User Cleanup (Testing)
```bash
# Basic cleanup
node cleanup-user-complete.js user@example.com

# Complete cleanup (includes all related data)
node cleanup-user-complete.js user@example.com --complete
```

### Server Commands
```bash
# Start server
cd Server && npm start

# Test API connection
curl http://localhost:5000/api/users/test-connection
```

---

## 🔧 Key Implementation Files

| Component | File Path | Purpose |
|-----------|-----------|---------|
| **Frontend Auth** | `Client/src/Components/LoginEnhanced.jsx` | Main authentication UI |
| **Backend Routes** | `Server/routes/userRoutes.js` | User API endpoints |
| **Firebase Config** | `Client/src/firebase.js` | Firebase setup |
| **Auth Middleware** | `Server/firebase.js` | Token verification |
| **User Model** | `Server/models/userModel.js` | Database schema |
| **Cleanup Script** | `Server/cleanup-user-complete.js` | Testing utility |

---

## 🎯 Authentication Flow Summary

### 1. **Email Signup**
```
User Input → Validation → Firebase Account → Verification Email → DB User (unverified) → Verification UI
```

### 2. **Email Login**
```
Credentials → Firebase Auth → Email Verified? → Token → DB Lookup → Update Verification → Dashboard
```

### 3. **Google OAuth**
```
Google Popup → Firebase Token → DB Lookup/Create → Auto-verified → Dashboard
```

### 4. **Forgot Password**
```
Email Input → Firebase Reset Email → User Clicks Link → New Password → Updated in Firebase
```

---

## 🔒 Security Checklist

- ✅ **Email verification required** before access
- ✅ **Password complexity** (8+ chars, mixed case, numbers)
- ✅ **Secure token handling** with Firebase JWT
- ✅ **Duplicate user prevention** via email primary key
- ✅ **Auto-signout** for unverified accounts
- ✅ **Error handling** with user-friendly messages

---

## 🧪 Testing Scenarios

### Test Case 1: New Email User
1. Sign up with email/password
2. Check email for verification link
3. Click verification link
4. Login with credentials ✅

### Test Case 2: Google User Tries Email
1. Sign up with Google OAuth
2. Try to login with same email using password
3. Should suggest using Google instead ✅

### Test Case 3: Unverified Login Attempt  
1. Sign up with email (don't verify)
2. Try to login
3. Should show verification reminder ✅

### Test Case 4: Password Reset
1. Click "Forgot Password"
2. Enter email address
3. Check email for reset link
4. Set new password ✅

### Test Case 5: Duplicate Prevention
1. Create account with email
2. Try to create another account with same email
3. Should handle gracefully ✅

---

## 🐛 Common Debugging Steps

### Issue: Login fails with 404 errors
**Solution:**
1. Check if server is running: `npm start`
2. Test API: Click "Test Server Connection" button
3. Check browser console for detailed logs

### Issue: Email verification not working
**Solution:**
1. Check spam folder
2. Verify Firebase email settings
3. Use resend verification button

### Issue: "User not found in database"
**Solution:**
1. Check Firebase and MongoDB are in sync
2. Verify token middleware is working
3. Use cleanup script to reset test data

### Issue: Duplicate user errors
**Solution:**
1. Run: `node cleanup-user-complete.js user@email.com`
2. Check database for existing records
3. Verify email uniqueness constraint

---

## 📧 Email Configuration

### Firebase Email Settings
- **Verification**: Automatic via `sendEmailVerification()`
- **Password Reset**: Automatic via `sendPasswordResetEmail()`
- **Sender**: `noreply@borrowease-32c45.firebaseapp.com`
- **Customization**: Firebase Console → Authentication → Templates

### Email Templates
- **Verification Subject**: "Verify your email for BorrowEase"
- **Reset Subject**: "Reset your password for BorrowEase"
- **Custom URL**: `${window.location.origin}/login?verified=true`

---

## 🔧 Configuration Variables

### Frontend (React)
```javascript
// Firebase config in src/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBNXmiPeruNlwxUmToNMcKdhQjNWn8E7AU",
  authDomain: "borrowease-32c45.firebaseapp.com",
  projectId: "borrowease-32c45",
  // ... other config
};
```

### Backend (Node.js)
```javascript
// Environment variables
MONGODB_URI=mongodb+srv://...
FIREBASE_ADMIN_KEY=path/to/serviceAccountKey.json
PORT=5000
```

---

## 📊 Database Schema Quick Reference

### User Model
```javascript
{
  name: String,           // User display name
  email: String,          // Primary identifier (unique)
  role: String,           // 'borrower', 'lender', 'admin'
  firebaseUids: [String], // Support multiple auth methods
  verified: Boolean,      // Email verification status
  kycStatus: String,      // KYC verification level
  createdAt: Date,        // Account creation timestamp
  updatedAt: Date         // Last modification timestamp
}
```

---

## 🚀 Production Deployment

### Pre-deployment Checklist
- ✅ Environment variables configured
- ✅ Firebase project settings updated
- ✅ MongoDB connection string updated
- ✅ CORS origins configured for production domain
- ✅ HTTPS enabled
- ✅ Email templates customized

### Firebase Console Setup
1. **Authentication → Sign-in Methods**: Enable Email/Password & Google
2. **Authentication → Templates**: Customize email content
3. **Authentication → Settings**: Add production domain to authorized domains

---

## 📞 Quick Support Commands

```bash
# Check user in database
node -e "
import('./config/db.js').then(({default: connectDB}) => {
  connectDB().then(() => {
    import('./models/userModel.js').then(({default: User}) => {
      User.findOne({email: 'user@example.com'}).then(user => {
        console.log(user);
        process.exit(0);
      });
    });
  });
});
"

# Delete specific user (testing)
node cleanup-user-complete.js user@example.com

# Check server health
curl -X GET http://localhost:5000/api/users/test-connection
```

---

## 📚 Related Documentation

- **Full Documentation**: `EMAIL_AUTHENTICATION_DOCUMENTATION.md`
- **Testing Scripts**: `TESTING_SCRIPTS_README.md` 
- **User Cleanup**: `cleanup-user-complete.js` (inline comments)
- **API Reference**: See main documentation file

---

**Last Updated**: August 29, 2025  
**Quick Reference Version**: 1.0.0
