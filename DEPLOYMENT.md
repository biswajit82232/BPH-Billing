# Deployment Guide - BPH Billing

## 🚀 Hosting Options

### Option 1: Firebase Hosting (Recommended) ⭐

**Why Firebase Hosting?**
- ✅ Already using Firebase Realtime Database
- ✅ Free tier (10 GB storage, 360 MB/day transfer)
- ✅ Fast CDN worldwide
- ✅ SSL certificate included
- ✅ Custom domain support
- ✅ Easy deployment

**Steps to Deploy:**

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**:
   ```bash
   firebase init hosting
   ```
   - Select "Use an existing project" or create a new one
   - Set public directory to: `dist`
   - Configure as single-page app: `Yes`
   - Set up automatic builds: `No` (we'll build manually)

4. **Update `.firebaserc`** with your Firebase project ID:
   ```json
   {
     "projects": {
       "default": "your-actual-project-id"
     }
   }
   ```

5. **Build your app**:
   ```bash
   npm run build
   ```

6. **Deploy to Firebase**:
   ```bash
   firebase deploy --only hosting
   ```

7. **Your app will be live at**: `https://your-project-id.web.app`

**For future updates:**
```bash
npm run build
firebase deploy --only hosting
```

---

### Option 2: GitHub Pages

**Why GitHub Pages?**
- ✅ Free forever
- ✅ Easy to set up
- ✅ Automatic deployments via GitHub Actions

**Steps to Deploy:**

1. **Update `vite.config.js`** (already done):
   ```js
   base: '/your-repo-name/'  // Add this if deploying to subdirectory
   ```

2. **Create GitHub repository** and push your code

3. **Create `.github/workflows/deploy.yml`**:
   ```yaml
   name: Deploy to GitHub Pages
   
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
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

4. **Enable GitHub Pages** in repository settings → Pages → Source: GitHub Actions

**Your app will be live at**: `https://your-username.github.io/your-repo-name`

---

### Option 3: Vercel (Easiest) ⚡

**Why Vercel?**
- ✅ Free tier with excellent performance
- ✅ Automatic deployments from GitHub
- ✅ Zero configuration needed
- ✅ Custom domain support

**Steps to Deploy:**

1. **Push your code to GitHub**

2. **Go to [vercel.com](https://vercel.com)** and sign up with GitHub

3. **Click "New Project"** and import your repository

4. **Configure**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Click Deploy** - Done! 🎉

**Your app will be live at**: `https://your-project.vercel.app`

---

### Option 4: Netlify

**Why Netlify?**
- ✅ Free tier
- ✅ Easy drag-and-drop deployment
- ✅ Continuous deployment from GitHub

**Steps to Deploy:**

1. **Push your code to GitHub**

2. **Go to [netlify.com](https://netlify.com)** and sign up

3. **Click "New site from Git"** → Select GitHub → Choose repository

4. **Configure**:
   - Build command: `npm run build`
   - Publish directory: `dist`

5. **Click Deploy** - Done! 🎉

**Your app will be live at**: `https://your-project.netlify.app`

---

## 📝 Pre-Deployment Checklist

- [ ] Build the app: `npm run build`
- [ ] Test the build locally: `npm run preview`
- [ ] Verify all features work in production build
- [ ] Check Firebase configuration (if using Firebase Hosting)
- [ ] Update `.firebaserc` with correct project ID (if using Firebase)
- [ ] Ensure environment variables are set (if any)
- [ ] Test PWA installation
- [ ] Verify service worker works

## 🔧 Environment Variables

If you need environment variables, create a `.env.production` file:
```
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_DATABASE_URL=your-url
# etc.
```

## 🌐 Custom Domain

All hosting platforms support custom domains:
- **Firebase**: Add domain in Firebase Console → Hosting → Add custom domain
- **Vercel**: Project Settings → Domains → Add domain
- **Netlify**: Site Settings → Domain Management → Add custom domain

## 📊 Recommendation

**For your use case, I recommend Firebase Hosting** because:
1. You're already using Firebase Realtime Database
2. Everything in one place (Database + Hosting)
3. Easy to manage
4. Free tier is generous
5. Fast and reliable

---

## 🆘 Troubleshooting

**Build fails?**
- Check Node.js version (should be 16+)
- Delete `node_modules` and `package-lock.json`, then `npm install`

**Firebase deploy fails?**
- Make sure you're logged in: `firebase login`
- Check project ID in `.firebaserc`
- Ensure `dist` folder exists after build

**App not loading?**
- Check browser console for errors
- Verify all assets are loading
- Check Firebase configuration

**PWA not working?**
- Ensure `manifest.json` is in `public` folder
- Check service worker registration
- Verify HTTPS (required for PWA)

---

Need help? Check the official docs:
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)

