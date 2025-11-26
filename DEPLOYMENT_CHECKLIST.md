# 🚀 Quick Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

- [ ] **Firebase Project**
  - [ ] Project created in Firebase Console
  - [ ] Realtime Database enabled
  - [ ] Location selected (e.g., asia-south1)

- [ ] **Environment Variables**
  - [ ] `.env.local` file created
  - [ ] All Firebase credentials filled in
  - [ ] Encryption key set (min 32 chars)
  - [ ] Sentry DSN configured (optional)

- [ ] **Firebase Configuration**
  - [ ] Firebase CLI installed (`npm install -g firebase-tools`)
  - [ ] Logged in (`firebase login`)
  - [ ] Project initialized (`firebase init` or `.firebaserc` exists)
  - [ ] `firebase.json` configured correctly

- [ ] **Code Verification**
  - [ ] Run `npm run verify` - all checks pass
  - [ ] Run `npm run lint` - no errors
  - [ ] Test locally - all features work

## Build & Deploy

- [ ] **Build**
  - [ ] Run `npm run build` - success
  - [ ] Check `dist/` folder exists
  - [ ] Run `npm run preview` - test production build

- [ ] **Deploy**
  - [ ] Deploy database rules: `firebase deploy --only database`
  - [ ] Deploy hosting: `npm run deploy`
  - [ ] Or deploy all: `npm run deploy:all`

## Post-Deployment

- [ ] **Verify**
  - [ ] Site accessible at Firebase URL
  - [ ] Login works
  - [ ] Can create invoice
  - [ ] Data syncs to Firebase
  - [ ] PWA installs correctly
  - [ ] Offline mode works

- [ ] **Security**
  - [ ] Database rules deployed
  - [ ] HTTPS enabled (automatic)
  - [ ] `.env.local` not in git

## Quick Commands

```bash
# Verify setup
npm run verify

# Build for production
npm run build

# Test production build locally
npm run preview

# Deploy to Firebase
npm run deploy

# Deploy everything (hosting + database)
npm run deploy:all
```

---

## ✅ Ready to Deploy?

If all boxes are checked, run:

```bash
npm run deploy
```

Or for a complete deployment (hosting + database rules):

```bash
npm run deploy:all
```

---

**📖 Full Instructions:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guide.

