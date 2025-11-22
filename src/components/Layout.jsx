import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BRAND } from '../data/branding'
import PendingSyncBanner from './PendingSyncBanner'
import PWAInstallPrompt from './PWAInstallPrompt'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from './ToastContainer'
import { initPWAInstall, promptPWAInstall, isPWA, getDeferredPrompt } from '../lib/pwa'

// Professional SVG Icons - Compact
const DashboardIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const InvoiceIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CustomersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const ProductsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)

const ReportIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const BackupIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
)

const links = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/invoices', label: 'Invoices', icon: InvoiceIcon },
  { to: '/customers', label: 'Customers', icon: CustomersIcon },
  { to: '/products', label: 'Products', icon: ProductsIcon },
  { to: '/gst-report', label: 'GST Report', icon: ReportIcon },
  { to: '/aging-report', label: 'Aging Report', icon: ClockIcon },
  { to: '/backup', label: 'Settings', icon: BackupIcon },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { currentUser, logout } = useAuth()
  const { settings, syncing, online, firebaseReady, pendingInvoices, syncPendingInvoices } = useData()
  const toast = useToast()
  
  // Determine sync status
  const hasSyncIssues = !firebaseReady || !online || pendingInvoices.length > 0
  const canSync = firebaseReady && online && pendingInvoices.length > 0 && !syncing
  
  // Check if mobile for sidebar animations
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024)
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // PWA Install state
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const checkInstallStatus = async () => {
      const installed = isPWA()
      setIsInstalled(installed)
      
      if (!installed) {
        // Check for service worker support
        const hasSW = 'serviceWorker' in navigator
        
        // Check if service worker is actually registered
        let swRegistered = false
        if (hasSW) {
          try {
            const registration = await navigator.serviceWorker.getRegistration()
            swRegistered = !!registration
          } catch (e) {
            console.error('Error checking service worker:', e)
          }
        }
        
        // Check for HTTPS or localhost
        const isSecure = window.location.protocol === 'https:' || 
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('0.0.0.0')
        
        // Check if running in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        
        // Detect mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (window.innerWidth <= 768)
        
        // On mobile, show button if:
        // 1. Service worker is supported (registration check is less strict on mobile)
        // 2. Secure context
        // 3. Not in standalone mode
        // On desktop, require service worker to be registered
        const shouldShow = hasSW && isSecure && !installed && !isStandalone && 
                          (isMobile ? true : swRegistered)
        
        setCanInstall(shouldShow)
      } else {
        setCanInstall(false)
      }
    }

    // Initial check
    checkInstallStatus()
    
    // On mobile, also check after a delay to allow service worker to register
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           (window.innerWidth <= 768)
    
    if (isMobileDevice) {
      // Give service worker time to register on mobile
      setTimeout(checkInstallStatus, 3000)
      setTimeout(checkInstallStatus, 5000)
    }
    
    // Initialize PWA install listener
    const cleanup = initPWAInstall((installable) => {
      // This will be called when beforeinstallprompt fires
      if (installable) {
        setCanInstall(true)
      }
    })

    // Check periodically for install status (in case browser changes state)
    const checkInterval = setInterval(checkInstallStatus, 2000)

    // Check on app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    
    return () => {
      if (cleanup) cleanup()
      clearInterval(checkInterval)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    const deferred = getDeferredPrompt()
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 768)
    
    if (deferred) {
      // Use the deferred prompt (works on desktop Chrome/Edge)
      try {
        const accepted = await promptPWAInstall()
        if (accepted) {
          setIsInstalled(true)
          setCanInstall(false)
          toast.success('App installed successfully!')
        }
      } catch (error) {
        console.error('Install error:', error)
        // Fallback to instructions
        showInstallInstructions(isMobile)
      }
    } else {
      // Mobile: Show instructions for "Add to Home Screen"
      showInstallInstructions(isMobile)
    }
  }

  const showInstallInstructions = (isMobile) => {
    if (isMobile) {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // iOS Safari
        toast.info('Tap Share (□↑) → "Add to Home Screen"', { duration: 5000 })
      } else if (/Android/i.test(navigator.userAgent)) {
        // Android Chrome
        toast.info('Tap menu (⋮) → "Add to Home screen" or "Install app"', { duration: 5000 })
      } else {
        toast.info('Tap browser menu → "Add to Home Screen"', { duration: 5000 })
      }
    } else {
      // Desktop
      if (window.navigator.userAgent.includes('Chrome') || window.navigator.userAgent.includes('Edg')) {
        toast.info('Click the install icon (⊕) in the address bar', { duration: 5000 })
      } else {
        toast.info('Check your browser menu for "Install App"', { duration: 5000 })
      }
    }
  }

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        document.body.style.top = ''
      }
    }

    if (sidebarOpen && window.innerWidth < 1024) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`
      document.body.dataset.scrollY = scrollY.toString()
    } else {
      const scrollY = document.body.dataset.scrollY || '0'
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollY !== '0') {
        window.scrollTo(0, parseInt(scrollY))
      }
      delete document.body.dataset.scrollY
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (document.body.dataset.scrollY) {
        window.scrollTo(0, parseInt(document.body.dataset.scrollY))
        delete document.body.dataset.scrollY
      }
    }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar backdrop - Smooth fade */}
      <div
        className="fixed inset-0 z-20 bg-gray-900 lg:hidden"
        onClick={() => setSidebarOpen(false)}
        style={{
          opacity: sidebarOpen ? 0.5 : 0,
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          ...(sidebarOpen && { willChange: 'opacity' }),
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          isolation: 'isolate'
        }}
      />

      {/* Sidebar - Zoho Compact Style - Smooth animation */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-200 ${
          !isMobile ? 'lg:static lg:inset-0' : ''
        }`}
        style={{
          transform: sidebarOpen || !isMobile
            ? 'translate3d(0, 0, 0)' 
            : 'translate3d(-100%, 0, 0)',
          transition: isMobile 
            ? 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
            : 'none',
          ...(sidebarOpen && isMobile && { willChange: 'transform' }),
          backfaceVisibility: 'hidden',
          isolation: 'isolate',
          contain: 'layout style paint'
        }}
      >
        {/* Brand Header - Compact */}
        <div className="h-14 flex items-center px-3 border-b border-gray-200 bg-gradient-to-r from-brand-primary to-blue-600">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
              <img 
                src="/logo.png" 
                alt={BRAND.name}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  // Fallback to the "B" letter if logo.png fails to load
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = '<span class="text-brand-primary font-bold text-base">B</span>'
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs leading-tight truncate">Biswajit</h1>
              <p className="text-white/80 text-[10px] leading-tight truncate">Power Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation - Compact - Performance Optimized */}
        <nav 
          className="flex-1 px-2 py-2 overflow-y-auto" 
          style={{ 
            willChange: 'scroll-position', 
            transform: 'translateZ(0)',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            scrollBehavior: 'smooth'
          }}
        >
          <div className="space-y-0.5" style={{ transform: 'translateZ(0)' }}>
            {links.map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors duration-200 ease-out ${
                      isActive
                        ? 'bg-blue-50 text-brand-primary border-l-2 border-brand-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-brand-primary'
                    }`
                  }
                  style={{
                    willChange: 'background-color, color',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  <Icon />
                  <span className="truncate">{link.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Footer Info - Compact */}
        <div className="p-2.5 border-t border-gray-200 bg-gray-50 space-y-2">
          {/* Login/Logout Section */}
          {settings.enableLoginGate && currentUser && (
            <div className="pb-2 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-[10px] text-gray-700">Logged in</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                >
                  Logout
                </button>
              </div>
              <p className="text-[10px] font-semibold text-emerald-700 truncate">{currentUser}</p>
            </div>
          )}
          <div className="text-[10px] text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-900 text-xs">Contact</p>
            <p className="truncate">{BRAND.contact[0]}</p>
            <p className="text-gray-500 text-[10px] line-clamp-2">{BRAND.address}</p>
          </div>

          {/* PWA Install Button - Show if not installed and has service worker support */}
          {!isInstalled && canInstall && (() => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                                  (window.innerWidth <= 768)
            const buttonText = isMobileDevice ? 'Add to Home Screen' : 'Install App'
            
            return (
              <button
                onClick={handleInstall}
                className="w-full mt-2 px-2.5 py-2 bg-gradient-to-r from-brand-primary to-blue-600 text-white rounded-md text-xs font-medium hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 transition-all duration-200 ease-out flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                style={{
                  willChange: 'background-color, transform',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{buttonText}</span>
              </button>
            )
          })()}

          {/* Installed Indicator */}
          {isInstalled && (
            <div className="w-full mt-2 px-2.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-medium flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>App Installed</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Compact */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-3 lg:px-4">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button - Smooth transition */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors duration-200 ease-out"
              aria-label="Toggle sidebar"
              style={{
                willChange: 'background-color',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-gray-900 truncate">{BRAND.tagline}</h2>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right text-xs">
              <p className="text-gray-600 truncate">{BRAND.email}</p>
            </div>
            {/* Firebase Sync Status Indicator - Top Right */}
            {firebaseReady && (
              <button
                onClick={async () => {
                  if (canSync) {
                    try {
                      await syncPendingInvoices()
                      toast.success('Sync initiated')
                    } catch {
                      toast.error('Failed to sync')
                    }
                  }
                }}
                disabled={!canSync && !syncing}
                className={`relative p-1 transition-opacity duration-200 ease-out ${
                  hasSyncIssues 
                    ? 'text-red-500 hover:opacity-80' 
                    : 'text-green-500 hover:opacity-80'
                } ${canSync ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  willChange: 'opacity',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
                title={
                  !firebaseReady 
                    ? 'Firebase not configured' 
                    : !online 
                    ? 'Offline - Data queued' 
                    : pendingInvoices.length > 0 
                    ? `Click to sync ${pendingInvoices.length} item(s)` 
                    : syncing 
                    ? 'Syncing...' 
                    : 'All synced'
                }
                aria-label={
                  !firebaseReady 
                    ? 'Firebase not configured' 
                    : !online 
                    ? 'Offline - Data queued' 
                    : pendingInvoices.length > 0 
                    ? `Click to sync ${pendingInvoices.length} item(s)` 
                    : syncing 
                    ? 'Syncing...' 
                    : 'All synced'
                }
              >
                <svg 
                  className={`w-5 h-5 ${syncing || (pendingInvoices.length > 0 && online) ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {hasSyncIssues && !syncing && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
                )}
              </button>
            )}
          </div>
        </header>

        <PendingSyncBanner />

        {/* Main Content Area - Compact - Performance Optimized */}
        <main 
          className="flex-1 overflow-y-auto bg-gray-50 pb-safe" 
          style={{ 
            willChange: 'scroll-position', 
            transform: 'translate3d(0, 0, 0)',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            scrollBehavior: 'smooth',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 lg:px-6 pb-20 sm:pb-4" style={{ transform: 'translate3d(0, 0, 0)' }}>
            {children}
          </div>
        </main>
        
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </div>
  )
}

