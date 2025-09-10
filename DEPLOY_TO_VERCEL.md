# 🚨 BEFORE YOU DEPLOY TO VERCEL 🚨

## This repository is NOT ready for direct deployment!

### Quick Pre-Deployment Steps:

1. **Deploy Backend First** 
   - Deploy `Server/` folder to Railway/Heroku
   - Get your backend URL (e.g., `https://your-app.railway.app`)

2. **Set Environment Variables in Vercel Dashboard**
   ```
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain  
   VITE_FIREBASE_PROJECT_ID=your_project
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud
   VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
   VITE_API_BASE_URL=https://your-backend.railway.app
   VITE_SOCKET_URL=https://your-backend.railway.app
   ```

3. **Read the Full Guide**
   - See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

### Validate Before Deploy:
```bash
cd Client
npm run validate
```

**⚠️ The build will FAIL without proper environment setup!**