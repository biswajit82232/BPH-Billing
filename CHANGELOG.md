# Changelog

All notable changes to the BPH Billing project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-XX

### 🔒 Security
- **CRITICAL:** Fixed Firebase security rules - changed from open access (`.read: true, .write: true`) to default deny with explicit allow rules
- Enhanced password hashing using Web Crypto API (SHA-256) with CryptoJS fallback
- Improved encryption for sensitive customer data (Aadhaar, DOB)
- Added validation rules for Firebase database writes

### 🐛 Bug Fixes
- Fixed 49 linting errors across the codebase
- Removed unused variables and imports
- Fixed React hooks rules violations
- Fixed duplicate object keys in SignaturePadModal
- Fixed conditional hook calls in InvoicePreviewModal
- Fixed circular dependency in AuthContext (updateUser called before declaration)
- Fixed process.env → import.meta.env migration in DataContext
- Fixed unused event handler parameters

### ✨ Improvements
- Added comprehensive encryption/decryption tests
- Added authentication context tests (requires Jest config update)
- Improved code quality and maintainability
- Better error handling in catch blocks
- Updated environment variable handling to use import.meta.env
- Added eslint-disable comments for intentional setState-in-effect cases

### 📝 Documentation
- Added comprehensive Deployment Readiness Report
- Updated security documentation
- Added CHANGELOG.md

### 🔧 Configuration
- Updated Jest configuration for ESM support (import.meta.env)
- Added setupTests.js for Jest environment setup
- Improved ESLint configuration

### ⚠️ Breaking Changes
None

### 🔄 Migration Steps
1. **Update Firebase Security Rules:**
   ```bash
   firebase deploy --only database
   ```
   ⚠️ **IMPORTANT:** Review the new rules in `firebase.rules.json` before deploying

2. **Environment Variables:**
   - No changes required if using existing `.env.local` or `src/config/firebaseConfig.js`
   - Verify all Firebase credentials are set correctly

3. **Testing:**
   - Run `npm test` to verify all tests pass
   - Run `npm run lint` to check for any remaining issues
   - Test authentication flows manually
   - Verify data encryption for existing customers

4. **Deployment:**
   ```bash
   npm run build
   npm run deploy
   ```

## [1.0.0] - Initial Release

### Features
- Invoice Management (Create, Edit, View, Manage)
- Customer Management with sticky notes and purchase history
- Product Management with stock tracking
- GST Reports (GSTR-1, GSTR-3B, Purchase reports)
- Aging Report for outstanding receivables
- User Management with permission-based access
- PWA support (Install as app, works offline)
- Firebase Sync (Automatic cloud backup)
- PDF Export for invoices
- WhatsApp Share functionality
- Print invoices directly

