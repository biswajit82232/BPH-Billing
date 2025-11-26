import { NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { BRAND } from '../data/branding'
import PendingSyncBanner from './PendingSyncBanner'
import PWAInstallPrompt from './PWAInstallPrompt'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from './ToastContainer'

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

const DistributorIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 014-4h4a4 4 0 014 4M7 7a4 4 0 118 0m6 8v4m0 0h-4m4 0h4" />
  </svg>
)

const links = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/invoices', label: 'Invoices', icon: InvoiceIcon },
  { to: '/customers', label: 'Customers', icon: CustomersIcon },
  { to: '/products', label: 'Products', icon: ProductsIcon },
  { to: '/gst-report', label: 'GST Report', icon: ReportIcon },
  { to: '/aging-report', label: 'Aging Report', icon: ClockIcon },
  { to: '/distributors/payables', label: 'Payables', icon: DistributorIcon },
  { to: '/backup', label: 'Settings', icon: BackupIcon },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [calcExpression, setCalcExpression] = useState('')
  const [calcResult, setCalcResult] = useState(null)
  const calculatorRef = useRef(null)
  const { currentUser, logout } = useAuth()
  const { settings, syncing, online, firebaseReady, pendingInvoices, syncPendingInvoices } = useData()
  const toast = useToast()
  
  // Determine sync status
  const hasSyncIssues = !firebaseReady || !online || pendingInvoices.length > 0
  const canSync = firebaseReady && online && pendingInvoices.length > 0 && !syncing

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calculatorRef.current && !calculatorRef.current.contains(event.target)) {
        setCalculatorOpen(false)
      }
    }

    if (calculatorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [calculatorOpen])

  const evaluateExpression = () => {
    if (!calcExpression.trim()) {
      setCalcResult(null)
      return
    }

    try {
      const sanitized = calcExpression.replace(/[^0-9+\-*/().%]/g, '')
      if (!sanitized) {
        setCalcResult('Err')
        return
      }
      const value = Function(`"use strict"; return (${sanitized})`)()
      setCalcResult(Number.isFinite(value) ? parseFloat(value.toFixed(2)) : 'Err')
    } catch {
      setCalcResult('Err')
    }
  }

  return (
    <div className="flex bg-gray-50 overflow-hidden" style={{ height: '100dvh', minHeight: '100vh' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Zoho Compact Style */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 sm:w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:w-56 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        {/* Brand Header - Compact */}
        <div className="h-14 flex items-center px-4 sm:px-3 border-b border-gray-200 bg-gradient-to-r from-brand-primary to-blue-600">
          <div className="flex items-center space-x-3 sm:space-x-2.5">
            <div className="w-10 h-10 sm:w-8 sm:h-8 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
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
              <h1 className="text-white font-semibold text-sm sm:text-xs leading-tight truncate">Biswajit</h1>
              <p className="text-white/80 text-xs sm:text-[10px] leading-tight truncate">Power Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation - Compact */}
        <nav className="flex-1 px-3 sm:px-2 py-2 overflow-y-auto" aria-label="Primary navigation">
          <div className="space-y-0.5">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  aria-label={`Navigate to ${link.label}`}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 sm:space-x-2.5 px-3 sm:px-2.5 py-2.5 sm:py-2 rounded-md text-sm sm:text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-brand-primary border-l-2 border-brand-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-brand-primary'
                    }`
                  }
                >
                  <Icon aria-hidden="true" />
                  <span className="truncate">{link.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Footer Info - Compact */}
        <div className="p-3 sm:p-2.5 border-t border-gray-200 bg-gray-50 space-y-2">
          {/* Login/Logout Section */}
          {settings.enableLoginGate && currentUser && (
            <div className="pb-2 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 sm:gap-1.5">
                  <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs sm:text-[10px] text-gray-700">Logged in</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Logout from application"
                  className="text-xs sm:text-[10px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                >
                  Logout
                </button>
              </div>
              <p className="text-xs sm:text-[10px] font-semibold text-emerald-700 truncate">{currentUser}</p>
            </div>
          )}
          <div className="text-xs sm:text-[10px] text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-900 text-sm sm:text-xs">Contact</p>
            <p className="truncate">{BRAND.contact[0]}</p>
            <p className="text-gray-500 text-xs sm:text-[10px] line-clamp-2">{BRAND.address}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Match Sidebar Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-3">
          <div className="flex items-center space-x-3 sm:space-x-2.5">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm sm:text-xs font-semibold text-gray-900 truncate">{BRAND.tagline}</h2>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-2.5">
            <div className="hidden md:block text-right text-xs sm:text-[10px]">
              <p className="text-gray-600 truncate">{BRAND.email}</p>
            </div>
            <div className="relative" ref={calculatorRef}>
              <button
                type="button"
                onClick={() => setCalculatorOpen((prev) => !prev)}
                className="p-1 rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                aria-expanded={calculatorOpen}
                aria-controls="header-calculator"
                aria-label="Toggle quick calculator"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2zm0 0h10M7 9h10M9 13h2m2 0h2m-6 4h2"
                  />
                </svg>
              </button>
              {calculatorOpen && (
                <div
                  id="header-calculator"
                  className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-700">Quick Calculator</p>
                    <button
                      type="button"
                      className="text-[10px] text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setCalcExpression('')
                        setCalcResult(null)
                        setCalculatorOpen(false)
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={calcExpression}
                      onChange={(e) => setCalcExpression(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          evaluateExpression()
                        }
                      }}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50"
                      placeholder="e.g. 1250 * 1.18"
                    />
                    <button
                      type="button"
                      onClick={evaluateExpression}
                      className="w-full text-center bg-brand-primary text-white text-sm font-medium rounded-md py-1.5 hover:bg-brand-primary/90 transition"
                    >
                      Calculate
                    </button>
                    {calcResult !== null && (
                      <div className="text-sm font-semibold text-gray-800">
                        Result:{' '}
                        {calcResult === 'Err' ? (
                          <span className="text-red-500">Invalid</span>
                        ) : (
                          <span className="text-brand-primary">{calcResult}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Firebase Sync Status Indicator - Top Right */}
            {firebaseReady && (
              <button
                onClick={async () => {
                  if (canSync) {
                    try {
                      await syncPendingInvoices()
                      toast.success('Sync initiated')
                    } catch (syncError) {
                      console.error('Manual sync failed', syncError)
                      toast.error('Failed to sync')
                    }
                  }
                }}
                disabled={!canSync && !syncing}
                className={`relative p-1 transition-opacity ${
                  hasSyncIssues 
                    ? 'text-red-500 hover:opacity-80' 
                    : 'text-green-500 hover:opacity-80'
                } ${canSync ? 'cursor-pointer' : 'cursor-default'}`}
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
                  className={`w-4 h-4 ${syncing || (pendingInvoices.length > 0 && online) ? 'animate-spin' : ''}`}
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

        {/* Main Content Area - Compact */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-gray-50 pb-safe" tabIndex="-1">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 lg:px-6 pb-20 sm:pb-4">
            {children}
          </div>
        </main>
        
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </div>
  )
}

