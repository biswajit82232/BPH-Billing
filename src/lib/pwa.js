/**
 * PWA Registration and Update Handler
 */

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return null
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('Service Worker registered:', registration.scope)

      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60000) // Check every minute

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            if (confirm('New version available! Reload to update?')) {
              newWorker.postMessage('SKIP_WAITING')
              window.location.reload()
            }
          }
        })
      })

      return registration
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error)
      return null
    })
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

