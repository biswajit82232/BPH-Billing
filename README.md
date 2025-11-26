# BPH Billing System 💼

Professional GST billing system for **Biswajit Power Hub** - Invoice, Customer & Product Management.

## ✨ Features

- 📄 **Invoice Management** - Create, edit, view, and manage invoices
- 👥 **Customer Management** - Track customers with sticky notes and purchase history
- 📦 **Product Management** - Manage products with stock tracking and purchase register
- 📊 **GST Reports** - Generate GSTR-1, GSTR-3B, and Purchase reports (PDF & CSV)
- ⏰ **Aging Report** - Track outstanding receivables by customer
- 🔐 **User Management** - Multi-user support with permission-based access
- 📱 **PWA** - Install as app, works offline
- ☁️ **Firebase Sync** - Automatic cloud backup and sync
- 📄 **PDF Export** - Download invoices as PDF
- 📱 **WhatsApp Share** - Share invoices directly via WhatsApp
- 🖨️ **Print** - Print invoices directly

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Firebase project created
- Git installed

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/bph-billing.git
   cd bph-billing
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values
   - Get values from [Firebase Console](https://console.firebase.google.com/)

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open browser**: `http://localhost:5173`

## 📋 Setup Instructions

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed Firebase and GitHub setup instructions.

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Build and deploy to Firebase Hosting
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
bph-billing/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── context/        # React contexts (Data, Auth)
│   ├── lib/            # Utilities and helpers
│   ├── utils/          # Calculation utilities
│   └── data/           # Static data (branding)
├── public/             # Static assets
├── .env                # Environment variables (not in git)
├── .env.example        # Environment variables template
├── firebase.json       # Firebase Hosting config
└── vite.config.js      # Vite configuration
```

## 🔒 Security

- Firebase keys are stored in `.env` (not committed to git)
- Database rules should be configured in Firebase Console
- User authentication and permissions are managed in-app

## 📦 Deployment

### Quick Deploy

1. **Configure Firebase**:
   ```bash
   cp ENV_EXAMPLE.txt .env.local
   # Edit .env.local with your Firebase credentials
   ```

2. **Verify setup**:
   ```bash
   npm run verify
   ```

3. **Deploy**:
   ```bash
   npm run build
   npm run deploy
   ```

### Detailed Instructions

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete step-by-step guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Quick checklist
- **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** - Overview

### Available Commands

- `npm run verify` - Check deployment readiness
- `npm run build` - Build for production
- `npm run preview` - Test production build locally
- `npm run deploy` - Build and deploy to Firebase Hosting
- `npm run deploy:all` - Deploy hosting + database rules

## 💰 Pricing

Firebase free tier is generous and should cover most small/medium businesses:
- **Hosting**: 10 GB storage, 360 MB/day transfer
- **Database**: 1 GB storage, 10 GB/month bandwidth

See [FIREBASE_PRICING.md](./FIREBASE_PRICING.md) for detailed pricing information.

## 📝 License

Private - Biswajit Power Hub

## 👤 Author

**Biswajit Power Hub**
- Email: biswajitpowerhub@gmail.com
- Address: Chunakhali, Berhampore, 742149

## 🙏 Acknowledgments

Built with React, Vite, Firebase, and Tailwind CSS.

---

**GSTIN**: 19AKFPH1283D1ZE
