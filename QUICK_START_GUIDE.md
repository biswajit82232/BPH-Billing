# 🚀 BPH Billing - Quick Start Guide

**Get your billing system up and running in 5 minutes!**

---

## 📦 Installation

### 1. Install Dependencies
```bash
cd "C:\Users\biswa\OneDrive\Desktop\BPH Billing"
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

**App will open at:** http://localhost:5173

---

## 🎯 First Time Setup

### Option A: Use Sample Data (No Firebase)
**Perfect for testing!**

1. Just run `npm run dev`
2. Application loads with sample data automatically
3. All features work offline
4. Data saved in browser's localStorage

### Option B: Connect to Firebase (Live Data)
**For production use with cloud sync:**

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Copy `.env.example` to `.env.local`
4. Add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. Restart dev server

---

## 📱 Basic Workflow

### 1. Add Customers (Optional)
- Go to **Customers** page
- Click **"+ Add Customer"**
- Fill in customer details
- Press **Ctrl+S** or click **"Save Customer"**

### 2. Add Products/Items (Optional)
- Go to **Items** page
- Click **"+ Add Item"**
- Enter product details (name, price, tax rate, stock)
- Press **Ctrl+S** or click **"Save Item"**

### 3. Create Your First Invoice
- Go to **Dashboard** → Click **"Create Invoice"**
- **OR** Go to **Invoices** → Click **"+ New Invoice"**

**Two ways to create invoices:**

#### Walk-in Customer (Quick)
1. Leave customer dropdown empty
2. Fill in customer details manually
3. Add items (use product dropdown or enter manually)
4. Click **"Save & Mark Sent"**

#### Saved Customer (Faster)
1. Select customer from dropdown
2. Add items from product dropdown
3. Click **"Save & Mark Sent"**

### 4. View & Manage Invoices
- Go to **Invoices** page
- **Search**: Type customer name or invoice number
- **Filter**: By status (Draft/Sent/Paid), date range
- **Sort**: Click column headers
- **Actions**: Edit, Delete, PDF, WhatsApp, Mark Paid

### 5. Generate PDF
- Open any invoice
- Click **"Generate PDF"** button
- PDF downloads automatically

### 6. Share on WhatsApp
- Open any invoice
- Click **"Share WhatsApp"** button
- **Android**: PDF shared directly via system
- **iOS/Desktop**: Download PDF, then open WhatsApp link

---

## 🎨 Key Features

### Dashboard
- 📊 Sales statistics
- 💰 Outstanding amounts
- 📦 Low stock alerts
- 📝 Recent activity

### Invoices
- 🆕 Create/Edit invoices
- 🔍 Search & filter
- 📄 PDF generation
- 💬 WhatsApp sharing
- 🏷️ Status tracking (Draft/Sent/Paid)
- 💰 Partial payment support

### Customers
- 👤 Customer master data
- 📱 Contact details (phone, email)
- 🆔 Aadhaar & DOB support
- 💼 GSTIN for registered businesses

### Products
- 📦 Inventory management
- 🏷️ SKU & HSN codes
- 💰 Pricing (selling & cost)
- 📊 Stock tracking with alerts
- 🔢 Tax rate selection

### Reports
- 📊 **GST Report**: Monthly tax summary, CSV exports
- ⏰ **Aging Report**: Overdue invoices tracking

### Settings
- 🔧 Invoice prefix
- 🌍 Company state
- 📦 Stock update mode
- 💾 Backup & restore

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+S** | Save form (Customers/Products) |
| **Esc** | Cancel/Clear form |
| **/** | Focus search box |

---

## 💡 Pro Tips

### 1. **Quick Invoice Creation**
- Use walk-in customer for one-time sales
- Save frequent customers in master for faster invoices

### 2. **Stock Management**
- Add products once, reuse in all invoices
- Set stock update mode in Settings
- Monitor low stock alerts on dashboard

### 3. **Tax Calculations**
- **Same state**: CGST + SGST (9% + 9% = 18%)
- **Different state**: IGST (18%)
- Set customer state correctly for accurate taxes

### 4. **Payment Tracking**
- Enter amount paid in invoice form
- Outstanding auto-calculated
- Mark as paid when fully paid

### 5. **Backup Regularly**
- Go to **Settings** → **Backup & Restore**
- Click **"Export JSON"**
- Save backup file safely
- Restore anytime with **"Import JSON"**

### 6. **Offline Mode**
- Works without internet
- Invoices saved to pending queue
- Auto-syncs when online
- See **"Pending Sync"** banner

---

## 📱 Install as Mobile App (PWA)

### Android/Chrome
1. Open in Chrome
2. Click menu (⋮)
3. Select **"Install app"** or **"Add to Home Screen"**

### iOS/Safari
1. Open in Safari
2. Tap Share button
3. Select **"Add to Home Screen"**

### Desktop
1. Look for install icon in address bar
2. Click **"Install"**

---

## 🔧 Common Tasks

### Change Invoice Prefix
1. Go to **Settings**
2. Change **"Invoice Prefix"** (e.g., "BPH" → "PWR")
3. Click **"Save Settings"**
4. New invoices will use new prefix

### Export GST Report
1. Go to **GST Report**
2. Select month
3. Click **"Export GSTR-1 CSV"** or **"Export GSTR-3B CSV"**
4. Open in Excel for filing

### Delete Invoice
1. Go to **Invoices**
2. Click **"Delete"** on invoice
3. Confirm deletion
4. **Note**: This is permanent!

### Edit Invoice
1. Go to **Invoices**
2. Click invoice number or **"Open"**
3. Make changes
4. Click **"Save & Mark Sent"**

---

## 📊 Sample Data

**The app comes with sample data:**
- 5 customers
- 10 products
- 15 invoices
- Activity log

**This helps you:**
- Explore features immediately
- Understand data structure
- Test without setup

**To clear sample data:**
1. Go to **Settings**
2. Export backup first (safety!)
3. Delete all customers/products/invoices
4. Start fresh

---

## 🐛 Troubleshooting

### Invoice not saving?
- Check internet connection (if using Firebase)
- Check **"Pending Sync"** banner
- Click **"Retry Sync"** in Settings

### PDF not generating?
- Ensure all invoice items are filled
- Check browser console for errors
- Try different browser

### WhatsApp not working?
- **Android**: Enable file sharing permissions
- **iOS**: Manual process - download then attach
- Check WhatsApp is installed

### Search not working?
- Clear search box
- Check filter settings
- Refresh page

---

## 🆘 Support

**Email:** biswajitpowerhub@gmail.com  
**Phone:** 9635505436 | 9775441797  
**Location:** Chunakhali, Berhampore, 742149

---

## 🎓 Learn More

- **README.md**: Full project documentation
- **COMPREHENSIVE_AUDIT_REPORT.md**: Complete feature list
- **CONSISTENT_ZOHO_DESIGN.md**: Design system
- **ICONS_README.md**: PWA icon setup

---

## ✅ Ready to Go!

You're all set! Start by:
1. ✅ Adding a few products
2. ✅ Adding a few customers
3. ✅ Creating your first invoice
4. ✅ Generating a PDF
5. ✅ Sharing on WhatsApp

**Happy Billing! 🎉**

---

**Version:** 1.0.0  
**Last Updated:** November 20, 2025

