// Global guard to prevent multiple page reloads
let isReloading = false
let reloadTimeout = null

export function safeReload(delay = 300) {
  // Prevent double reload
  if (isReloading) return
  
  isReloading = true
  
  // Clear any existing timeout
  if (reloadTimeout) clearTimeout(reloadTimeout)
  
  reloadTimeout = setTimeout(() => {
    window.location.reload()
  }, delay)
}

// Reset guard after page reload (in case of navigation without reload)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    isReloading = false
    if (reloadTimeout) clearTimeout(reloadTimeout)
  })
}

