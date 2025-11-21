# ✅ Deployment Checklist - BPH Billing

## 🎯 Pre-Deployment Status

### ✅ Completed
- [x] Firebase CLI installed (v14.26.0)
- [x] Firebase project configured (`bhp-billing`)
- [x] Logged in to Firebase
- [x] Production build tested and working
- [x] `firebase.json` configured with hosting and database rules
- [x] `.firebaserc` has correct project ID
- [x] Database rules file exists (`firebase.rules.json`)
- [x] Build scripts configured in `package.json`
- [x] PWA manifest and service worker configured
- [x] All required files in place

### ⚠️ Action Required

#### 1. Environment Variables (REQUIRED)
**Status:** Not configured yet

**Option A: Create `.env.local`** (Recommended)
```bash
# Copy the example
copy ENV_EXAMPLE.txt .env.local
```

Then edit `.env.local` and add your Firebase credentials:
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=bhp-billing.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://bhp-billing-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=bhp-billing
VITE_FIREBASE_STORAGE_BUCKET=bhp-billing.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Option B: Create `src/config/firebaseConfig.js`**
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "bhp-billing.firebaseapp.com",
  databaseURL: "https://bhp-billing-default-rtdb.firebaseio.com",
  projectId: "bhp-billing",
  storageBucket: "bhp-billing.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
}
export default firebaseConfig
```

**Get credentials from:**
Firebase Console → Project Settings → Your apps → Web app config

---

## 🚀 Deployment Steps

### Step 1: Set Environment Variables
Complete the action above (create `.env.local` or `firebaseConfig.js`)

### Step 2: Deploy Database Rules
```bash
firebase deploy --only database
```

### Step 3: Deploy to Hosting
```bash
npm run deploy
```

Or use the helper script:
- **Windows:** `deploy.bat`
- **Linux/Mac:** `bash deploy.sh`

### Step 4: Verify
- Visit: `https://bhp-billing.web.app`
- Test app functionality
- Check Firebase connection works
- Test creating an invoice

---

## 📝 Quick Reference

### Deployment Commands
```bash
# Build only
npm run build

# Deploy everything
npm run deploy

# Deploy hosting only
firebase deploy --only hosting

# Deploy database rules only
firebase deploy --only database

# Deploy both
firebase deploy --only hosting,database
```

### Testing Commands
```bash
# Test production build locally
npm run preview

# Development server
npm run dev
```

---

## 🔍 Verification

After deployment, verify:
- [ ] App loads at hosting URL
- [ ] No console errors (F12)
- [ ] Firebase connection works
- [ ] Can create/view invoices
- [ ] Can manage customers
- [ ] Can manage products
- [ ] PDF generation works
- [ ] PWA installable

---

## 🆘 Troubleshooting

**"Firebase not connecting"**
- Check `.env.local` has correct values
- Verify Realtime Database is enabled in Firebase Console
- Check browser console for specific errors

**"Database rules not working"**
- Run: `firebase deploy --only database`
- Check Firebase Console → Realtime Database → Rules

**"Build fails"**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**"Deployment fails"**
- Verify logged in: `firebase login`
- Check project ID: `firebase projects:list`
- Verify `dist/` folder exists after build

---

## ✅ Ready to Deploy!

Once you add the Firebase credentials (Step 1 above), you're ready to deploy!

**Quick Deploy:**
```bash
npm run deploy
```

Your app will be live at:
- `https://bhp-billing.web.app`
- `https://bhp-billing.firebaseapp.com`

---

**Last Updated:** Based on current project scan  
**Status:** 95% Ready - Just need Firebase credentials!

