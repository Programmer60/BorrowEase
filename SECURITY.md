Security hardening and public repository readiness

Before making this repository public, complete the following checklist:

- [x] Firebase Admin uses environment variables only (no JSON file in repo)
- [x] Remove any hardcoded API keys from client and server
- [x] `.env` files are ignored by git; provide `.env.example` only
- [x] Payment providers (e.g., Razorpay) do not have default secrets in code
- [x] Cloudinary config does not fall back to real account values
- [x] Rotate any keys that were ever committed in git history
- [x] Purge or rewrite git history to remove committed secrets (see below)

Secrets detected historically to rotate:
- Firebase service account key (Server/serviceAccountKey.json)
- Razorpay test keys (if used)
- Cloudinary API secret
- MongoDB connection string

History cleanup quick guide (optional but recommended):
1. Rotate the above secrets in their providers.
2. Use a tool like git filter-repo to remove files from history:
   - Remove file: Server/serviceAccountKey.json
   - Scrub patterns: `mongodb+srv://`, `CLOUDINARY_API_SECRET`, `RAZORPAY_KEY_SECRET`
3. Force-push a new clean history to a new public repo, or archive the private repo first.

Runtime environment variables required:
- Server: MONGO_URI, EMAIL_PROVIDER, SMTP_*, SENDGRID_*, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, FIREBASE_SERVICE_ACCOUNT_BASE64 OR {FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY}, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
- Client: VITE_API_BASE_URL, VITE_FIREBASE_*, VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_API_KEY

Contact: Please open a security advisory (not a public issue) for vulnerabilities.