/**
 * PWA Registration and Update Handler
 */

import { registerSW } from 'virtual:pwa-register'

export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return null
  }

  let refreshing = false

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (refreshing) return
      if (confirm('New version available! Reload to update?')) {
        refreshing = true
        updateSW(true)
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline')
    },
    onRegistered(r) {
      r &&
        setInterval(() => {
          r.update().catch(() => {})
        }, 60000)
    },
  })

  return updateSW
}

export const unregisterServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
    })
  })
}

/**
 * Check if app can be installed
 */
let deferredPrompt = null

export const initPWAInstall = (onInstallPrompt) => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    if (onInstallPrompt) {
      onInstallPrompt(true)
    }
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    if (onInstallPrompt) {
      onInstallPrompt(false)
    }
  })
}

export const promptPWAInstall = async () => {
  if (!deferredPrompt) {
    return false
  }

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}

/**
 * Check if running as PWA
 */
export const isPWA = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

