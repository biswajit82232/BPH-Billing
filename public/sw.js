const CACHE_VERSION = 'v3'
const CACHE_NAME = `bph-billing-${CACHE_VERSION}`
const RUNTIME_CACHE = 'bph-billing-runtime'
const STATIC_CACHE = 'bph-billing-static'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/favicon.svg'
]

// Static assets that don't change often
const STATIC_ASSETS = [
  '/logo.png',
  '/icon-192.png',
  '/favicon.svg'
]

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
    ]).then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => 
            cacheName !== CACHE_NAME && 
            cacheName !== RUNTIME_CACHE && 
            cacheName !== STATIC_CACHE
          )
          .map((cacheName) => caches.delete(cacheName))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - network first, fallback to cache (optimized for PWA)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip Firebase requests (always go to network for real-time data)
  if (url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('google.com')) {
    return
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      // For navigation requests (HTML), try cache first for faster loading
      if (event.request.mode === 'navigate') {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background
            fetch(event.request).then((response) => {
              if (response.status === 200) {
                cache.put(event.request, response.clone())
              }
            }).catch(() => {})
            return cachedResponse
          }
          // Not in cache, fetch from network
          return fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
                cache.put(event.request, response.clone())
              }
              return response
            })
            .catch(() => {
              // Network failed, return cached index.html
              return caches.match('/index.html') || caches.match('/')
            })
        })
      }

      // For assets (JS, CSS, images), try network first, fallback to cache
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200 && response.type !== 'error') {
            cache.put(event.request, response.clone())
          }
          return response
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Return offline response for failed requests
            if (event.request.destination === 'image') {
              return new Response('', { status: 503 })
            }
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            })
          })
        })
    })
  )
})

// Background Sync for pending invoices
const SYNC_TAG = 'sync-pending-invoices'

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingInvoices())
  }
})

async function syncPendingInvoices() {
  try {
    // Notify client to sync pending invoices
    // The client has access to Firebase and can perform the actual sync
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_PENDING_INVOICES'
      })
    })
  } catch (error) {
    console.error('Background sync error:', error)
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data === 'REQUEST_BACKGROUND_SYNC') {
    // Register background sync
    if ('sync' in self.registration) {
      self.registration.sync.register(SYNC_TAG).catch(console.error)
    }
  }
})

