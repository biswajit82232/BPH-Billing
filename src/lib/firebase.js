import { initializeApp, getApps } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const configModules = import.meta.glob('../config/firebaseConfig.js', { eager: true })
const inlineConfig = configModules['../config/firebaseConfig.js']?.default || {}

const windowConfig =
  typeof window !== 'undefined' && window.__BPH_FIREBASE_CONFIG__
    ? window.__BPH_FIREBASE_CONFIG__
    : {}

export const firebaseConfig = {
  ...envConfig,
  ...inlineConfig,
  ...windowConfig,
}

const hasConfig = Boolean(firebaseConfig?.apiKey && firebaseConfig?.databaseURL)

let firebaseApp = null
let databaseInstance = null

export function ensureFirebase() {
  if (!hasConfig) return { app: null, db: null, configured: false }

  if (!firebaseApp) {
    const existing = getApps()
    firebaseApp = existing.length ? existing[0] : initializeApp(firebaseConfig)
  }

  if (!databaseInstance) {
    databaseInstance = getDatabase(firebaseApp)
  }

  return { app: firebaseApp, db: databaseInstance, configured: true }
}

export function getFirebaseDatabase() {
  return ensureFirebase().db
}

export function isFirebaseConfigured() {
  return hasConfig
}

