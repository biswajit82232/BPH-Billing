#!/bin/bash

echo "========================================"
echo "  BPH Billing - Deployment Script"
echo "========================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "[ERROR] Firebase CLI not found!"
    echo "Please install: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
echo "[1/4] Checking Firebase login..."
if ! firebase projects:list &> /dev/null; then
    echo "[ERROR] Not logged in to Firebase!"
    echo "Please run: firebase login"
    exit 1
fi
echo "[OK] Logged in to Firebase"
echo ""

# Check if environment variables are set
echo "[2/4] Checking environment variables..."
if [ ! -f .env.local ] && [ ! -f "src/config/firebaseConfig.js" ]; then
    echo "[WARNING] No environment variables found!"
    echo "Please create .env.local or src/config/firebaseConfig.js"
    echo "See PREPARE_DEPLOYMENT.md for instructions"
    echo ""
    read -p "Continue anyway? (y/n): " continue
    if [ "$continue" != "y" ] && [ "$continue" != "Y" ]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi
echo "[OK] Environment check passed"
echo ""

# Build the app
echo "[3/4] Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed!"
    exit 1
fi
echo "[OK] Build successful"
echo ""

# Deploy to Firebase
echo "[4/4] Deploying to Firebase Hosting..."
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "[ERROR] Deployment failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "Your app is live at:"
echo "  https://bhp-billing.web.app"
echo "  https://bhp-billing.firebaseapp.com"
echo ""

