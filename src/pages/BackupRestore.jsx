import { useRef, useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useAuth, ALL_PAGES } from '../context/AuthContext'
import { useToast } from '../components/ToastContainer'
import PageHeader from '../components/PageHeader'
import { clearLocalData, clearPendingInvoices } from '../lib/storage'

export default function BackupRestore() {
  const fileRef = useRef(null)
  const toast = useToast()
  const { backupData, restoreBackup, settings, updateSettings, pendingInvoices, syncPendingInvoices } = useData()
  const { users, addUser, updateUser, deleteUser, replaceUsers } = useAuth()
  const [localSettings, setLocalSettings] = useState(settings)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    companyInfo: false,
    invoiceSettings: false,
    inventorySettings: false,
    features: false,
  })
  
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }
  const [userForm, setUserForm] = useState({
    id: '',
    username: '',
    password: '',
    name: '',
    active: true,
    permissions: [],
  })
  const [editingUserId, setEditingUserId] = useState(null)
  
  // Pull to refresh state
  const [pullToRefresh, setPullToRefresh] = useState({ 
    isPulling: false, 
    startY: 0, 
    distance: 0, 
    isRefreshing: false 
  })
  const pullStartRef = useRef(null)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // Pull to refresh functionality (mobile only, upper 1/3)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let currentDistance = 0
    let rafId = null
    
    const handleTouchStart = (e) => {
      if (window.innerWidth > 768) return
      const touch = e.touches[0]
      const startY = touch.clientY
      const scrollY = window.scrollY || document.documentElement.scrollTop
      
      if (startY > window.innerHeight / 3) return
      if (scrollY > 10) return
      
      pullStartRef.current = { startY, startScrollY: scrollY }
      currentDistance = 0
      setPullToRefresh({ isPulling: false, startY, distance: 0, isRefreshing: false })
    }

    const updatePullState = () => {
      if (!pullStartRef.current) return
      const distance = Math.min(currentDistance, 80)
      setPullToRefresh(prev => ({
        ...prev,
        isPulling: currentDistance > 5,
        distance: distance
      }))
    }

    const handleTouchMove = (e) => {
      if (!pullStartRef.current) return
      if (window.innerWidth > 768) return
      
      const touch = e.touches[0]
      const currentY = touch.clientY
      const newDistance = Math.max(0, currentY - pullStartRef.current.startY)
      
      currentDistance = currentDistance + (newDistance - currentDistance) * 0.3
      
      if (currentDistance > 0 && currentDistance < 100) {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          updatePullState()
          if (currentDistance > 5 && currentDistance < 100) {
            rafId = requestAnimationFrame(updatePullState)
          }
        })
        
        if (currentDistance > 10) e.preventDefault()
      } else {
        if (rafId) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      }
    }

    const handleTouchEnd = (e) => {
      if (!pullStartRef.current) return
      if (window.innerWidth > 768) return
      
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      
      if (currentDistance > 60) {
        setPullToRefresh(prev => ({ ...prev, isRefreshing: true, isPulling: false, distance: 70 }))
        setTimeout(() => window.location.reload(), 300)
      } else {
        const startDistance = currentDistance
        const startTime = performance.now()
        const duration = 300
        
        const animateReturn = (currentTime) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          
          const newDistance = startDistance * (1 - eased)
          setPullToRefresh(prev => ({ 
            ...prev, 
            isPulling: newDistance > 5, 
            distance: newDistance 
          }))
          
          if (progress < 1) {
            requestAnimationFrame(animateReturn)
          } else {
            setPullToRefresh(prev => ({ ...prev, isPulling: false, distance: 0 }))
          }
        }
        
        requestAnimationFrame(animateReturn)
      }
      
      currentDistance = 0
      pullStartRef.current = null
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const exportJson = () => {
    try {
      const data = {
        ...backupData(),
        users,
      }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `bph-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
      toast.success('Backup file downloaded!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export backup')
    }
  }

  const importJson = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const { users: importedUsers, ...payload } = data || {}
      await restoreBackup(payload)
      if (Array.isArray(importedUsers)) {
        await replaceUsers(importedUsers)
      }
      toast.success('Backup restored successfully!')
      event.target.value = ''
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import backup. Check file format.')
    event.target.value = ''
    }
  }

  const handleSettingsSubmit = async (event) => {
    event.preventDefault()
    try {
    await updateSettings(localSettings)
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    }
  }

  return (
    <div className="space-y-6 w-full relative">
      {/* Pull to refresh indicator */}
      {(pullToRefresh.isPulling || pullToRefresh.isRefreshing) && (
        <div 
          className="fixed top-4 left-1/2 z-50 md:hidden"
          style={{ 
            opacity: Math.min(pullToRefresh.distance / 40, 1),
            transform: `translate(-50%, ${Math.max(0, pullToRefresh.distance - 40)}px)`,
            transition: pullToRefresh.isRefreshing 
              ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out' 
              : 'none',
            willChange: 'transform, opacity'
          }}
        >
          <div 
            className="bg-white rounded-full p-2 shadow-lg transition-all duration-200"
            style={{
              transform: `scale(${Math.min(1 + (pullToRefresh.distance / 200), 1.1)})`
            }}
          >
            {pullToRefresh.isRefreshing ? (
              <svg 
                className="animate-spin h-6 w-6 text-blue-600" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg 
                className="h-6 w-6 text-blue-600"
                style={{
                  transform: `rotate(${Math.min(pullToRefresh.distance * 2.5, 180)}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
        </div>
      )}
      <PageHeader
        title="Settings & Backup"
        subtitle="Manage application settings and data backup"
      />
      
      <section className="glass-panel p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Backup & Restore</h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" 
            onClick={exportJson}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
          <button 
            className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors" 
            onClick={() => fileRef.current?.click()}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import JSON
          </button>
        </div>

        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
        
        {pendingInvoices.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-yellow-800">
                ⚠️ {pendingInvoices.length} invoice(s) pending sync
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors" 
                onClick={async () => {
                  try {
                    await syncPendingInvoices()
                    toast.success('Pending invoices synced!')
                  } catch {
                    toast.error('Failed to sync. Check connection.')
                  }
                }}
              >
                Retry Sync
              </button>
              <button 
                className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors" 
                onClick={() => {
                  if (window.confirm(`Clear ${pendingInvoices.length} pending invoice(s) from sync queue?`)) {
                    clearPendingInvoices()
                    toast.success('Pending invoices cleared!')
                    setTimeout(() => window.location.reload(), 500)
                  }
                }}
              >
                Clear Queue
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <button 
            className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors" 
            onClick={() => {
              if (window.confirm('⚠️ WARNING: This will delete ALL local data including invoices, customers, products, and purchases. This action CANNOT be undone!\n\nAre you absolutely sure?')) {
                clearLocalData()
                clearPendingInvoices()
                toast.success('Local data cleared! Refreshing page...')
                setTimeout(() => window.location.reload(), 1000)
              }
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All Local Data
          </button>
          <p className="text-xs text-gray-500 mt-2">
            This will permanently delete all data stored in your browser. Use with caution.
          </p>
        </div>
      </section>

      <section className="glass-panel p-3 sm:p-6 space-y-3 sm:space-y-5">
        <div className="flex items-center gap-2 pb-2 sm:pb-3 border-b border-gray-200">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Application Settings</h3>
        </div>
        
        <form className="space-y-3 sm:space-y-4" onSubmit={handleSettingsSubmit}>
          {/* Company Information */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('companyInfo')}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="truncate">Company Information</span>
              </h4>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${expandedSections.companyInfo ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.companyInfo && (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-gray-400 text-xs">(for invoices)</span>
                  </label>
                  <input
                    className="w-full text-sm"
                    value={localSettings.companyName || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="e.g., Biswajit Power Hub"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Displayed on all invoices</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Tagline <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    className="w-full text-sm"
                    value={localSettings.companyTagline || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, companyTagline: e.target.value }))}
                    placeholder="e.g., Powering Every Ride"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Tagline displayed below company name</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Address
                </label>
                <textarea
                  className="w-full text-sm"
                  rows={2}
                  value={localSettings.companyAddress || ''}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, companyAddress: e.target.value }))}
                  placeholder="e.g., Chunakhali, Berhampore, 742149"
                />
                <p className="text-xs text-gray-500 mt-0.5">Full business address for invoices</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number(s)
                  </label>
                  <input
                    className="w-full text-sm"
                    value={localSettings.companyMobile || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, companyMobile: e.target.value }))}
                    placeholder="e.g., 9635505436 / 9775441797"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Contact number(s) for invoices</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full text-sm"
                    value={localSettings.companyEmail || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, companyEmail: e.target.value }))}
                    placeholder="e.g., biswajitpowerhub@gmail.com"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Email address for invoices</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company State <span className="text-gray-400 text-xs">(for GST calculation)</span>
                  </label>
                  <input
                    className="w-full text-sm"
                    value={localSettings.companyState || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, companyState: e.target.value }))}
                    placeholder="e.g., West Bengal"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Used to determine CGST/SGST vs IGST</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company GSTIN <span className="text-gray-400 text-xs">(15 characters)</span>
                  </label>
                  <input
                    className="w-full font-mono text-sm"
                    value={localSettings.companyGstin || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, companyGstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) }))}
                    placeholder="19AKFPH1283D1ZE"
                    maxLength="15"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Your business GST identification number</p>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Invoice Settings */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('invoiceSettings')}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">Invoice Settings</span>
              </h4>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${expandedSections.invoiceSettings ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.invoiceSettings && (
            <div className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Prefix
                </label>
                <input
                  className="w-full text-sm"
                  value={localSettings.invoicePrefix}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, invoicePrefix: e.target.value }))}
                  placeholder="INV"
                />
                <p className="text-xs text-gray-500 mt-0.5">Prefix for invoice numbers (e.g., INV-001)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Style
                </label>
                <select
                  className="w-full text-sm"
                  value={localSettings.invoiceStyle || 'style1'}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, invoiceStyle: e.target.value }))}
                >
                  <option value="style1">Style 1 - Classic</option>
                  <option value="style2">Style 2 - Modern</option>
                  <option value="style3">Style 3 - Compact</option>
                  <option value="style4">Style 4 - Professional</option>
                  <option value="style5">Style 5 - Minimal</option>
                </select>
                <p className="text-xs text-gray-500 mt-0.5">Visual style for all invoices</p>
              </div>
            </div>
            </div>
            )}
          </div>

          {/* Inventory Settings */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('inventorySettings')}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="truncate">Inventory Settings</span>
              </h4>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${expandedSections.inventorySettings ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.inventorySettings && (
            <div className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Update Mode
                </label>
                <select
                  className="w-full text-sm"
                  value={localSettings.stockUpdateMode}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, stockUpdateMode: e.target.value }))}
                >
                  <option value="sent">On Sent - Update when invoice is sent</option>
                  <option value="paid">On Paid - Update when invoice is paid</option>
                  <option value="manual">Manual - Update stock manually only</option>
                </select>
                <p className="text-xs text-gray-500 mt-0.5">When to automatically reduce product stock</p>
              </div>
            </div>
            </div>
            )}
          </div>

          {/* Feature Toggles */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('features')}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="truncate">Feature Toggles</span>
              </h4>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${expandedSections.features ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.features && (
            <div className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-start gap-2 p-2.5 border border-gray-200 rounded-md cursor-pointer hover:border-brand-primary hover:bg-blue-50 transition-all">
                <input
                  type="checkbox"
                  checked={localSettings.enableLoginGate}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, enableLoginGate: e.target.checked }))}
                  className="rounded mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 block">Enable Login Gate</span>
                  <span className="text-xs text-gray-600 mt-0.5 block">Require authentication to access</span>
                </div>
              </label>
              <label className="flex items-start gap-2 p-2.5 border border-gray-200 rounded-md cursor-pointer hover:border-brand-primary hover:bg-blue-50 transition-all">
                <input
                  type="checkbox"
                  checked={localSettings.enablePurchases}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, enablePurchases: e.target.checked }))}
                  className="rounded mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 block">Purchase Register</span>
                  <span className="text-xs text-gray-600 mt-0.5 block">Track purchases and ITC</span>
                </div>
              </label>
            </div>
            </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-gray-200 gap-2">
            <p className="text-xs text-gray-500 order-2 sm:order-1">
              Changes are saved when you click "Save Settings"
            </p>
            <button type="submit" className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors order-1 sm:order-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </button>
          </div>
        </form>
      </section>

      {/* User Management Section */}
      {settings.enableLoginGate && (
        <section className="glass-panel p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => {
                setUserForm({
                  id: '',
                  username: '',
                  password: '',
                  name: '',
                  active: true,
                  permissions: [],
                })
                setEditingUserId(null)
                setShowUserManagement(true)
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>
          
          {users.length === 0 && !showUserManagement && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">No users found</p>
              <p className="text-xs text-gray-500">Add your first user to get started</p>
            </div>
          )}

          {showUserManagement && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {editingUserId ? 'Edit User' : 'Add New User'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserManagement(false)
                    setEditingUserId(null)
                    setUserForm({
                      id: '',
                      username: '',
                      password: '',
                      name: '',
                      active: true,
                      permissions: [],
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (editingUserId) {
                    try {
                      const result = await updateUser(editingUserId, userForm)
                      if (result && result.success) {
                        toast.success('User updated successfully!')
                        setShowUserManagement(false)
                        setEditingUserId(null)
                        setUserForm({
                          id: '',
                          username: '',
                          password: '',
                          name: '',
                          active: true,
                          permissions: [],
                        })
                      } else {
                        toast.error(result?.error || 'Failed to update user')
                      }
                    } catch (error) {
                      console.error('Error updating user:', error)
                      toast.error('Failed to update user')
                    }
                  } else {
                    try {
                      const result = await addUser(userForm)
                      if (result && result.success) {
                        toast.success('User added successfully!')
                        setShowUserManagement(false)
                        setUserForm({
                          id: '',
                          username: '',
                          password: '',
                          name: '',
                          active: true,
                          permissions: [],
                        })
                      } else {
                        toast.error(result?.error || 'Failed to add user')
                      }
                    } catch (error) {
                      console.error('Error adding user:', error)
                      toast.error('Failed to add user')
                    }
                  }
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full"
                      value={userForm.username}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
                      required
                      disabled={!!editingUserId}
                      placeholder="Enter unique username"
                    />
                    {editingUserId && (
                      <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {editingUserId ? (
                        <>New Password <span className="text-gray-400 text-xs font-normal">(leave blank to keep current)</span></>
                      ) : (
                        <>Password <span className="text-red-500">*</span></>
                      )}
                    </label>
                    <input
                      type="password"
                      className="w-full"
                      value={userForm.password}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                      required={!editingUserId}
                      placeholder={editingUserId ? "Enter new password" : "Enter password"}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full"
                    value={userForm.name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter user's full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Permissions
                    <span className="text-gray-400 text-xs font-normal ml-2">(Select pages user can access)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={userForm.permissions.includes('all')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserForm((prev) => ({ ...prev, permissions: ['all'] }))
                          } else {
                            setUserForm((prev) => ({ ...prev, permissions: [] }))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-700">All Pages</span>
                    </label>
                    {ALL_PAGES.map((page) => (
                      <label
                        key={page.key}
                        className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={userForm.permissions.includes(page.key) || userForm.permissions.includes('all')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserForm((prev) => ({
                                ...prev,
                                permissions: [...prev.permissions.filter(p => p !== 'all'), page.key],
                              }))
                            } else {
                              setUserForm((prev) => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== page.key),
                              }))
                            }
                          }}
                          disabled={userForm.permissions.includes('all')}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-700">{page.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.active}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, active: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="text-xs font-medium px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    {editingUserId ? 'Update User' : 'Add User'}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    onClick={() => {
                      setShowUserManagement(false)
                      setEditingUserId(null)
                      setUserForm({
                        id: '',
                        username: '',
                        password: '',
                        name: '',
                        active: true,
                        permissions: [],
                      })
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {users.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Existing Users ({users.length})</h4>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-primary transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{user.username}</span>
                          {user.name && (
                            <span className="text-sm text-gray-600">({user.name})</span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                              user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            {user.permissions.includes('all')
                              ? 'All Pages'
                              : user.permissions.length > 0
                              ? `${user.permissions.length} page(s)`
                              : 'No access'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                        <button
                          type="button"
                          className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1 flex-1 sm:flex-none justify-center"
                          onClick={() => {
                            setUserForm({
                              id: user.id,
                              username: user.username,
                              password: '',
                              name: user.name || '',
                              active: user.active,
                              permissions: user.permissions || [],
                            })
                            setEditingUserId(user.id)
                            setShowUserManagement(true)
                          }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1 flex-1 sm:flex-none justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={async () => {
                            if (window.confirm(`Delete user "${user.username}"? This action cannot be undone.`)) {
                              try {
                                const result = await deleteUser(user.id)
                                if (result && result.success) {
                                  toast.success('User deleted successfully!')
                                } else {
                                  toast.error('Failed to delete user')
                                }
                              } catch (error) {
                                console.error('Error deleting user:', error)
                                toast.error('Failed to delete user')
                              }
                            }
                          }}
                          disabled={users.length === 1}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

