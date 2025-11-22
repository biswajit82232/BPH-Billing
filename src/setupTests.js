// Jest setup file
import '@testing-library/jest-dom'

// Mock import.meta.env for Jest
if (typeof globalThis.import === 'undefined') {
  globalThis.import = {
    meta: {
      env: {
        VITE_ENCRYPTION_KEY: process.env.VITE_ENCRYPTION_KEY || 'test-encryption-key',
        VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com',
        VITE_FIREBASE_DATABASE_URL: process.env.VITE_FIREBASE_DATABASE_URL || 'https://test.firebaseio.com',
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'test.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456',
        VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || 'test-app-id',
        PROD: false,
        DEV: true,
        MODE: 'test',
      },
    },
  }
}

