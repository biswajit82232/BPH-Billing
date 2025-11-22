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
let installPromptCallback = null

export const initPWAInstall = (onInstallPrompt) => {
  installPromptCallback = onInstallPrompt

  // Listen for beforeinstallprompt event
  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault()
    deferredPrompt = e
    if (onInstallPrompt) {
      onInstallPrompt(true)
    }
  }

  // Check immediately if already installable
  if (deferredPrompt && onInstallPrompt) {
    onInstallPrompt(true)
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

  // Listen for app installed event
  const handleAppInstalled = () => {
    deferredPrompt = null
    if (onInstallPrompt) {
      onInstallPrompt(false)
    }
  }

  window.addEventListener('appinstalled', handleAppInstalled)

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  }
}

export const promptPWAInstall = async () => {
  if (!deferredPrompt) {
    // Fallback: Try to trigger browser's native install UI
    // This will show the install option in the menu if available
    console.log('Install prompt not available. Check if app can be installed via browser menu.')
    return false
  }

  try {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    
    if (installPromptCallback) {
      installPromptCallback(outcome !== 'accepted')
    }
    
    return outcome === 'accepted'
  } catch (error) {
    console.error('Error prompting for install:', error)
    deferredPrompt = null
    if (installPromptCallback) {
      installPromptCallback(false)
    }
    return false
  }
}

export const getDeferredPrompt = () => {
  return deferredPrompt
}

export const canInstallApp = () => {
  // Check multiple conditions for installability
  const isInstalled = isPWA()
  const hasPrompt = deferredPrompt !== null
  const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  const hasServiceWorker = 'serviceWorker' in navigator
  
  // App is installable if:
  // 1. Not already installed
  // 2. Has install prompt OR (HTTPS and service worker)
  // 3. Service worker is registered
  return !isInstalled && (hasPrompt || (isHTTPS && hasServiceWorker))
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

