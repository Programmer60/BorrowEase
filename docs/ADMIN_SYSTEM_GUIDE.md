# BorrowEase Admin System Documentation

## Overview
The BorrowEase admin system provides comprehensive management capabilities for loan moderation, KYC verification, and user management. All borrower requests must be approved by admin before they become available to lenders.

## Admin System Components

### 1. Admin Dashboard (`/admin`)
- **Central hub** for all admin operations
- **Real-time statistics** for users, loans, KYC submissions
- **Recent activity** monitoring
- **System alerts** and notifications
- **Quick navigation** to all admin functions

### 2. Loan Moderation (`/admin/loans`)
- **Pending loan review** - All new loan requests start as "pending"
- **Loan approval/rejection** with reasons
- **Loan statistics** and filtering
- **Search functionality** by borrower details
- **Status tracking**: pending → approved → funded → repaid

### 3. KYC Management (`/admin/kyc`)
- **Document verification** system
- **Identity verification** workflow
- **KYC approval/rejection** with comments
- **Document viewer** for uploaded files
- **Verification status tracking**

### 4. User Management (`/admin/users`)
- **Role management** (borrower, lender, admin)
- **User statistics** and analytics
- **Account activation/deactivation**
- **User search and filtering**

## Workflow Process

### Borrower Loan Request Flow
1. **Borrower** creates loan request → Status: "pending"
2. **Admin** reviews loan → Approves/Rejects with reason
3. If **approved** → Loan becomes visible to lenders
4. **Lender** funds the loan → Status: "funded"
5. **Chat system** becomes available between borrower and lender
6. **Borrower** repays loan → Status: "repaid"

### KYC Verification Flow
1. **User** submits KYC documents and personal information
2. **Admin** reviews documents in KYC management panel
3. **Admin** verifies or rejects with detailed comments
4. **User** receives notification about KYC status
5. **Verified users** get enhanced platform privileges

## Admin Features

### Dashboard Analytics
- Total users by role (borrowers, lenders, admins)
- Loan statistics (total, pending, approved, funded, repaid)
- KYC verification metrics
- Platform health monitoring
- Recent activity feed

### Loan Moderation Features
- **Filter loans** by status (all, pending, approved, rejected)
- **Search loans** by borrower name, email, purpose, or amount
- **Sort loans** by date, amount, or status
- **Batch operations** for multiple loans
- **Detailed loan information** display
- **Approval/rejection** with mandatory reasons for rejections

### KYC Management Features
- **Document viewer** for Aadhar, PAN, selfies
- **Personal information** verification
- **Income verification** capabilities
- **Address verification** system
- **Multi-stage approval** process
- **Comment system** for review notes

### Security Features
- **Role-based access control** - Only admins can access admin panels
- **Audit logging** for all admin actions
- **Secure document handling**
- **Firebase authentication** integration

## API Endpoints

### Loan Management
- `GET /api/loans/admin/all` - Get all loans for admin review
- `GET /api/loans/admin/pending` - Get pending loans only  
- `GET /api/loans/admin/stats` - Get loan statistics
- `PATCH /api/loans/admin/approve/:id` - Approve a loan
- `PATCH /api/loans/admin/reject/:id` - Reject a loan

### KYC Management
- `GET /api/kyc/admin/all` - Get all KYC submissions
- `GET /api/kyc/admin/stats` - Get KYC statistics
- `GET /api/kyc/admin/:id` - Get specific KYC details
- `PUT /api/kyc/:id/review` - Review KYC submission
- `POST /api/kyc/submit` - Submit KYC (user endpoint)
- `GET /api/kyc/status` - Get user's KYC status

### User Management
- `GET /api/users/all` - Get all users (admin only)
- `PATCH /api/users/:id/role` - Change user role
- `DELETE /api/users/:id` - Delete user account

## Navigation Structure

### Main Navigation (Admin Only)
- **Admin Dashboard** → `/admin`
- **Loan Moderation** → `/admin/loans`  
- **KYC Management** → `/admin/kyc`
- **User Management** → `/admin/users`

### Admin Profile Dropdown
- Admin Dashboard
- Loan Moderation  
- KYC Management
- User Management
- Profile Settings
- Logout

## Database Models

### KYC Model
- User information and document storage
- Verification status tracking
- Admin review comments
- Document metadata

### Loan Model (Enhanced)
- Admin approval workflow
- Status progression tracking
- Approval/rejection reasons
- Admin action logging

### User Model (Enhanced)
- KYC status integration
- Role management (including admin)
- Activity tracking

## Chat System Integration

### Loan Chat Requirements
- **Only funded loans** allow chat access
- **Borrower and lender** can communicate
- **Real-time messaging** via Socket.IO
- **Message history** persistence
- **Authentication required** for chat access

### Chat Features
- Real-time messaging
- Typing indicators
- Message read receipts
- Chat history per loan
- File sharing capabilities (future)

## Getting Started as Admin

1. **Login** with admin credentials
2. **Navigate** to Admin Dashboard (`/admin`)
3. **Review pending loans** in Loan Moderation
4. **Verify KYC submissions** in KYC Management
5. **Monitor system health** via dashboard metrics

## Important Notes

- **All loan requests** must be admin-approved before lenders can see them
- **KYC verification** is recommended before loan approval
- **Chat system** only works for funded loans
- **Audit trail** maintains all admin actions
- **Real-time notifications** keep admins informed of new submissions

## Security Considerations

- **Role verification** on every admin endpoint
- **Token-based authentication** via Firebase
- **Input validation** on all admin actions
- **Document security** for KYC files
- **Activity logging** for audit purposes

This comprehensive admin system ensures proper oversight and control over the BorrowEase platform while maintaining security and user experience.
