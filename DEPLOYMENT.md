# 🚀 Deployment Guide

Complete guide to deploy BPH Billing System to production.

## 📋 Pre-Deployment Checklist

### ✅ Code Readiness
- [x] All pages complete and functional
- [x] Performance optimizations applied
- [x] No linting errors
- [x] All features tested
- [x] Error handling in place
- [x] PWA configured

### 🔧 Configuration Required

1. **Firebase Project Setup**
   - [ ] Create Firebase project (if not exists)
   - [ ] Enable Realtime Database
   - [ ] Configure authentication (optional)
   - [ ] Set up hosting

2. **Environment Variables**
   - [ ] Create `.env.local` file with Firebase credentials
   - [ ] Configure encryption key
   - [ ] Set Sentry DSN (optional, for error tracking)

3. **Firebase Security Rules**
   - [x] Rules file exists (`firebase.rules.json`)
   - [ ] Deploy rules to Firebase

---

## 🔐 Step 1: Firebase Configuration

### 1.1 Create/Configure Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable **Realtime Database**
   - Go to Database section
   - Create Realtime Database
   - Choose your location (e.g., asia-south1 for India)

### 1.2 Get Firebase Credentials

1. Go to **Project Settings** > **General**
2. Scroll to "Your apps" section
3. Click **Web app** icon (</>) to add web app
4. Copy the Firebase configuration values

### 1.3 Configure Environment Variables

Create `.env.local` file in project root:

```bash
# Copy the example file
cp ENV_EXAMPLE.txt .env.local
```

Edit `.env.local` with your Firebase credentials:

```env
# Firebase Configuration (REQUIRED)
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Business Configuration (Optional - can be changed in Settings)
VITE_COMPANY_GSTIN=19AKFPH1283D1ZE
VITE_COMPANY_STATE=West Bengal
VITE_INVOICE_PREFIX=BPH

# Encryption Key (REQUIRED - change to random string)
VITE_ENCRYPTION_KEY=your-random-encryption-key-min-32-chars

# Sentry Error Tracking (Optional)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**Important:** 
- Never commit `.env.local` to git (already in `.gitignore`)
- Use a strong random encryption key (minimum 32 characters)

---

## 📦 Step 2: Install Dependencies & Build

### 2.1 Install Firebase CLI (if not installed)

```bash
npm install -g firebase-tools
```

### 2.2 Login to Firebase

```bash
firebase login
```

### 2.3 Install Project Dependencies

```bash
npm install
```

### 2.4 Build for Production

```bash
npm run build
```

This will:
- Create optimized production build in `dist/` folder
- Minify and bundle all assets
- Generate service worker for PWA
- Code split for optimal loading

**Verify build:**
```bash
npm run preview
```
Visit `http://localhost:4173` to test the production build locally.

---

## 🔒 Step 3: Deploy Firebase Security Rules

Before deploying the app, deploy database security rules:

```bash
firebase deploy --only database
```

This deploys `firebase.rules.json` to protect your database.

---

## 🚀 Step 4: Deploy to Firebase Hosting

### Option 1: Quick Deploy (Build + Deploy)

```bash
npm run deploy
```

This runs:
1. `npm run build` - Creates production build
2. `firebase deploy --only hosting` - Deploys to Firebase

### Option 2: Manual Deploy

```bash
# Build first
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Step 4.1: First Time Setup

If this is your first deployment:

1. Initialize Firebase in your project:
```bash
firebase init hosting
```

2. When prompted:
   - **What do you want to use as your public directory?** → `dist`
   - **Configure as a single-page app?** → `Yes`
   - **Set up automatic builds and deploys with GitHub?** → `No` (or Yes if using CI/CD)

3. Verify `firebase.json` is configured correctly (already done)

---

## ✅ Step 5: Post-Deployment Verification

### 5.1 Verify Deployment

1. Visit your Firebase Hosting URL:
   ```
   https://your-project-id.web.app
   or
   https://your-project-id.firebaseapp.com
   ```

2. Test these features:
   - [ ] App loads correctly
   - [ ] Login works
   - [ ] Can create invoice
   - [ ] Can add customer
   - [ ] Can add product
   - [ ] Data syncs to Firebase
   - [ ] Works offline (PWA)
   - [ ] Can install as app (PWA)

### 5.2 Check Firebase Console

1. Go to Firebase Console > Database
2. Verify data structure is correct
3. Check security rules are active

### 5.3 Performance Check

1. Open browser DevTools
2. Check Network tab - assets should load quickly
3. Check Application > Service Workers - PWA should be registered
4. Check Lighthouse score (aim for 90+)

---

## 🔄 Continuous Deployment

### Automatic Deployment Script

You can set up automatic deployments using:

```bash
# Deploy everything (hosting + database rules)
firebase deploy
```

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

---

## 🌐 Custom Domain Setup (Optional)

1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow instructions to verify domain
4. Update DNS records as instructed
5. Wait for SSL certificate (automatic)

---

## 📱 PWA Installation

After deployment, users can:

1. **Mobile:**
   - Visit site in browser
   - Tap "Add to Home Screen"
   - App installs as standalone app

2. **Desktop:**
   - Visit site in Chrome/Edge
   - Click install icon in address bar
   - App installs as desktop app

---

## 🔧 Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build
```

### Firebase Deployment Errors

```bash
# Re-authenticate
firebase logout
firebase login

# Check Firebase project
firebase projects:list
firebase use your-project-id
```

### Environment Variables Not Working

- Ensure `.env.local` exists in root directory
- Variables must start with `VITE_`
- Rebuild after changing `.env.local`
- Check `.env.local` is not committed to git

### Database Rules Not Applied

```bash
# Deploy rules separately
firebase deploy --only database
```

### Service Worker Not Updating

- Clear browser cache
- Unregister service worker in DevTools
- Hard refresh (Ctrl+Shift+R)

---

## 📊 Monitoring & Maintenance

### 1. Error Tracking (Sentry)

If configured:
- Monitor errors at [sentry.io](https://sentry.io)
- Get alerts for production issues

### 2. Firebase Analytics (Optional)

Enable in Firebase Console for usage statistics.

### 3. Regular Backups

- Use Backup/Restore feature in Settings page
- Export data regularly
- Keep `.json` backups secure

### 4. Updates

```bash
# Pull latest code
git pull

# Update dependencies
npm update

# Test locally
npm run dev

# Deploy
npm run deploy
```

---

## 🎯 Production Best Practices

1. ✅ **Security**
   - Strong encryption key
   - Firebase security rules deployed
   - HTTPS enabled (automatic with Firebase)

2. ✅ **Performance**
   - Code splitting enabled
   - Assets optimized
   - Service worker caching

3. ✅ **Monitoring**
   - Error tracking (Sentry)
   - Regular backups
   - Performance monitoring

4. ✅ **Documentation**
   - Keep this guide updated
   - Document any custom configurations

---

## 📞 Support

If you encounter issues:
1. Check Firebase Console for errors
2. Check browser console for client errors
3. Review deployment logs
4. Check `firebase.rules.json` syntax

---

## ✅ Deployment Checklist Summary

- [ ] Firebase project created and configured
- [ ] `.env.local` file created with credentials
- [ ] Dependencies installed (`npm install`)
- [ ] Production build successful (`npm run build`)
- [ ] Build tested locally (`npm run preview`)
- [ ] Firebase rules deployed (`firebase deploy --only database`)
- [ ] App deployed to hosting (`firebase deploy --only hosting`)
- [ ] Site accessible and functional
- [ ] PWA installation works
- [ ] Data syncs correctly
- [ ] Offline mode works

**🎉 Once all checked, your app is live in production!**

