# Complete Setup Guide - Firebase + GitHub

## 📋 Step-by-Step Instructions

---

## Part 1: Firebase Setup 🔥

### Step 1: Create Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Click "Add project"** or "Create a project"
3. **Enter project name**: `bph-billing` (or your preferred name)
4. **Disable Google Analytics** (optional, not needed for billing app)
   - Uncheck "Enable Google Analytics for this project"
   - Click "Create project"
5. **Wait for project creation** (takes ~30 seconds)
6. **Click "Continue"**

### Step 2: Enable Realtime Database

1. **In Firebase Console**, click on your project
2. **In left sidebar**, click **"Build"** → **"Realtime Database"**
3. **Click "Create Database"**
4. **Choose location**: Select closest region (e.g., `asia-south1` for India)
5. **Security Rules**: Choose **"Start in test mode"** (we'll secure it later)
6. **Click "Enable"**

### Step 3: Get Firebase Configuration

1. **In Firebase Console**, click **⚙️ Settings** (gear icon) → **"Project settings"**
2. **Scroll down** to "Your apps" section
3. **Click the Web icon** (`</>`) to add a web app
4. **Register app**:
   - App nickname: `BPH Billing Web`
   - Check "Also set up Firebase Hosting" (optional, we'll do it separately)
   - Click "Register app"
5. **Copy the Firebase configuration** (you'll see something like):
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   }
   ```

### Step 4: Configure Firebase in Your App

**Option A: Using Environment Variables (Recommended for GitHub)**

1. **Create `.env` file** in project root:
   ```bash
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

2. **The app will automatically read from `.env`** (already configured in `firebase.js`)

**Option B: Using Config File (Alternative)**

1. **Create `src/config/firebaseConfig.js`**:
   ```javascript
   export default {
     apiKey: "your-api-key-here",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   }
   ```

### Step 5: Secure Database Rules

1. **In Firebase Console**, go to **Realtime Database** → **Rules** tab
2. **Replace the rules** with:
   ```json
   {
     "rules": {
       ".read": "auth != null || true",
       ".write": "auth != null || true"
     }
   }
   ```
   ⚠️ **Note**: This allows read/write for now. For production, you should add proper authentication rules.

3. **Click "Publish"**

### Step 6: Test Firebase Connection

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Create a test invoice** in your app
3. **Check Firebase Console** → **Realtime Database** → You should see data appear!

---

## Part 2: GitHub Setup 📦

### Step 1: Create GitHub Repository

1. **Go to [GitHub.com](https://github.com)** and sign in
2. **Click the "+" icon** (top right) → **"New repository"**
3. **Repository details**:
   - Repository name: `bph-billing` (or your preferred name)
   - Description: `Biswajit Power Hub - Professional GST Billing System`
   - Visibility: **Private** (recommended for business app) or **Public**
   - **DO NOT** check "Initialize with README" (we already have files)
4. **Click "Create repository"**

### Step 2: Initialize Git (if not already done)

1. **Open terminal** in your project folder
2. **Check if git is initialized**:
   ```bash
   git status
   ```

3. **If not initialized, run**:
   ```bash
   git init
   ```

### Step 3: Add Files to Git

1. **Add all files**:
   ```bash
   git add .
   ```

2. **Check what will be committed**:
   ```bash
   git status
   ```

3. **Make first commit**:
   ```bash
   git commit -m "Initial commit: BPH Billing System"
   ```

### Step 4: Connect to GitHub

1. **Copy your repository URL** from GitHub (click green "Code" button)
   - It will look like: `https://github.com/your-username/bph-billing.git`

2. **Add remote repository**:
   ```bash
   git remote add origin https://github.com/your-username/bph-billing.git
   ```

3. **Push to GitHub**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

4. **Enter your GitHub credentials** when prompted

### Step 5: Verify on GitHub

1. **Refresh your GitHub repository page**
2. **You should see all your files!** ✅

---

## Part 3: Security Best Practices 🔒

### Step 1: Protect Sensitive Files

Your `.gitignore` already excludes:
- `.env` (Firebase keys)
- `src/config/firebaseConfig.js` (if you use this method)
- `node_modules`
- `dist`

### Step 2: Create `.env.example` (Template)

1. **Create `.env.example`** file:
   ```bash
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

2. **Commit this file** (it's safe, just a template):
   ```bash
   git add .env.example
   git commit -m "Add environment variables template"
   git push
   ```

### Step 3: Add README.md

Create a `README.md` with setup instructions (optional but recommended).

---

## Part 4: Future Updates 🔄

### To Push Updates to GitHub:

```bash
# 1. Check what changed
git status

# 2. Add changes
git add .

# 3. Commit with message
git commit -m "Description of changes"

# 4. Push to GitHub
git push
```

### To Pull Latest from GitHub:

```bash
git pull
```

---

## Part 5: Firebase Hosting Setup (Optional - For Later)

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Hosting

```bash
firebase init hosting
```

- Select your Firebase project
- Public directory: `dist`
- Single-page app: `Yes`
- Automatic builds: `No`

### Step 4: Update `.firebaserc`

Edit `.firebaserc` and replace `your-firebase-project-id` with your actual project ID.

### Step 5: Deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## ✅ Checklist

### Firebase Setup:
- [ ] Firebase project created
- [ ] Realtime Database enabled
- [ ] Firebase config copied
- [ ] `.env` file created with config
- [ ] Database rules updated
- [ ] Test connection (create invoice, check Firebase)

### GitHub Setup:
- [ ] GitHub repository created
- [ ] Git initialized
- [ ] Files committed
- [ ] Connected to GitHub
- [ ] Code pushed successfully
- [ ] `.env.example` created (optional)

### Security:
- [ ] `.env` is in `.gitignore` ✅ (already done)
- [ ] Firebase keys not in GitHub ✅
- [ ] Database rules configured

---

## 🆘 Troubleshooting

### Firebase Connection Issues:
- **Check `.env` file exists** and has correct values
- **Check database URL** is correct (should end with `.firebaseio.com`)
- **Check database rules** allow read/write
- **Check browser console** for errors

### GitHub Push Issues:
- **Authentication**: Use GitHub Personal Access Token if password doesn't work
- **Large files**: Make sure `node_modules` and `dist` are in `.gitignore`
- **Merge conflicts**: Run `git pull` first if repository has changes

### Environment Variables Not Working:
- **Restart dev server** after creating `.env`
- **Check variable names** start with `VITE_`
- **Check `.env` file** is in project root (not in `src`)

---

## 📝 Quick Reference Commands

```bash
# Firebase
firebase login
firebase init hosting
firebase deploy --only hosting

# Git
git status
git add .
git commit -m "Your message"
git push
git pull

# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run deploy       # Build and deploy to Firebase
```

---

## 🎉 You're All Set!

Once you complete these steps:
1. ✅ Firebase is configured and working
2. ✅ Your code is safely backed up on GitHub
3. ✅ You can deploy anytime with `npm run deploy`

**Need help?** Check the error messages and browser console for specific issues!

