# 🛡️ Admin Access Guide - BorrowEase

## How to Access Admin Panel

### For Admin Users:

Admin users now have **multiple ways** to access the admin panel:

#### 🔗 **Method 1: Main Navigation (Recommended)**
- After logging in, you'll see a prominent **red "Admin Panel"** button in the main navigation bar
- Click on it to go directly to the admin dashboard

#### 👤 **Method 2: Profile Dropdown**
- Click on your profile picture/name in the top-right corner
- You'll see your role displayed as "Admin User" 
- Click on **"Admin Panel"** option in the dropdown menu

#### 📱 **Method 3: Mobile Menu**
- On mobile devices, tap the hamburger menu (☰)
- You'll see the **"Admin Panel"** option in red
- Tap it to access the admin dashboard

#### 🔗 **Method 4: Direct URL**
- You can always navigate directly to: `http://localhost:5173/admin/users`
- This will redirect you to the admin panel if you're logged in as an admin

### Admin Panel Features:

1. **User Management Tab**
   - View all users
   - Change user roles (borrower ↔ lender ↔ admin)
   - Delete users
   - Search and filter users
   - View user statistics

2. **Loan Moderation Tab**
   - Review pending loan applications
   - Approve or reject loans with reasons
   - Search and filter loans by status
   - View loan statistics and approval rates
   - Send automatic notifications to borrowers

### 🔐 Security Notes:

- Only users with `role: "admin"` in the database can access admin features
- All admin routes are protected with authentication middleware
- Admin actions are logged and tracked

### 🛠️ Troubleshooting:

**If you can't see the admin options:**

1. **Check your user role:** Make sure your user account has `role: "admin"` in the database
2. **Refresh the page:** Sometimes the role detection needs a page refresh
3. **Clear browser cache:** Old cached data might be causing issues
4. **Check console logs:** Open browser developer tools to see any authentication errors

**To verify your admin status:**
- Your profile dropdown should show "Admin User" 
- You should see the red "Admin Panel" button in the navigation
- Console logs should show: `👤 User role fetched in Navbar: admin`

### 📞 Need Help?

If you're still unable to access the admin panel:
1. Check the browser console for any errors
2. Verify your user role in the database
3. Ensure you're logged in with the correct admin account
4. Try the direct URL method as a fallback

---

**Admin Email:** mishrashivam7465@gmail.com  
**Default Admin Panel URL:** http://localhost:5173/admin/users
