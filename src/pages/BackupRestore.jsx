import { useRef, useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useAuth, ALL_PAGES } from '../context/AuthContext'
import { useToast } from '../components/ToastContainer'
import PageHeader from '../components/PageHeader'
import ConfirmModal from '../components/ConfirmModal'
import { clearLocalData, clearPendingInvoices } from '../lib/storage'
import { safeReload } from '../utils/reloadGuard'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

export default function BackupRestore() {
  const fileRef = useRef(null)
  const toast = useToast()
  const { backupData, restoreBackup, settings, updateSettings, pendingInvoices, syncPendingInvoices, resetAllData, firebaseReady, online, refreshData } = useData()
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
  
  const [resettingCloud, setResettingCloud] = useState(false)
  const [confirmFullReset, setConfirmFullReset] = useState({ isOpen: false, step: 1 })
  const [confirmClearLocal, setConfirmClearLocal] = useState(false)
  const [confirmClearPending, setConfirmClearPending] = useState(false)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState({ isOpen: false, userId: null, username: '' })
  const [resetConfirmationText, setResetConfirmationText] = useState('')
  
  const pullToRefresh = usePullToRefresh({ onRefresh: refreshData })

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

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

  const handleFullResetClick = () => {
    setConfirmFullReset({ isOpen: true, step: 1 })
  }

  const handleFullResetConfirm = async () => {
    // Step 2 - check confirmation text
    if (resetConfirmationText.trim().toUpperCase() !== 'RESET') {
      toast.error('Please type "RESET" to confirm')
      return
    }

    try {
      setResettingCloud(true)
      setConfirmFullReset({ isOpen: false, step: 1 })
      setResetConfirmationText('')
      await resetAllData()
      toast.success('All local and Firebase data cleared. Reloading...')
      safeReload(1500)
    } catch (error) {
      console.error('Full reset failed:', error)
      toast.error('Failed to reset data. Check console/network.')
    } finally {
      setResettingCloud(false)
    }
  }

  const handleClearLocal = () => {
    clearLocalData()
    clearPendingInvoices()
    toast.success('Local data cleared! Refreshing page...')
    safeReload(1000)
  }

  const handleClearPending = () => {
    clearPendingInvoices()
    toast.success('Pending invoices cleared!')
    safeReload(500)
  }

  const handleDeleteUserConfirm = async () => {
    if (!confirmDeleteUser.userId) return
    try {
      const result = await deleteUser(confirmDeleteUser.userId)
      if (result && result.success) {
        toast.success('User deleted successfully!')
      } else {
        toast.error('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    } finally {
      setConfirmDeleteUser({ isOpen: false, userId: null, username: '' })
    }
  }

  return (
    <div className="space-y-6 w-full relative">
      <PullToRefreshIndicator state={pullToRefresh} />
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
                onClick={() => setConfirmClearPending(true)}
              >
                Clear Queue
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <button 
            className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors" 
            onClick={() => setConfirmClearLocal(true)}
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

        <div className="border-t border-gray-200 pt-4">
          <button
            className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-red-800 hover:bg-red-900"
            onClick={handleFullResetClick}
            disabled={resettingCloud || !firebaseReady || !online}
          >
            {resettingCloud ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6m6-6v12" />
              </svg>
            )}
            Reset Local + Firebase Data
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Requires internet & Firebase connection. Deletes all synced data permanently.
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
                          onClick={() => setConfirmDeleteUser({ isOpen: true, userId: user.id, username: user.username })}
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

      {/* Confirmation Modals */}
      {confirmFullReset.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {confirmFullReset.step === 1 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">⚠️ Full Data Reset</h3>
                  <button
                    onClick={() => setConfirmFullReset({ isOpen: false, step: 1 })}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-700 mb-6">
                  This will delete ALL invoices, customers, products, purchases, settings and activity both locally and on Firebase. This cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    className="btn-secondary"
                    onClick={() => setConfirmFullReset({ isOpen: false, step: 1 })}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary bg-red-600 hover:bg-red-700"
                    onClick={() => setConfirmFullReset({ isOpen: true, step: 2 })}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Full Reset</h3>
                <p className="text-sm text-gray-700 mb-4">Type <strong>RESET</strong> to confirm full data wipe:</p>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                  value={resetConfirmationText}
                  onChange={(e) => setResetConfirmationText(e.target.value)}
                  placeholder="Type RESET"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && resetConfirmationText.trim().toUpperCase() === 'RESET') {
                      handleFullResetConfirm()
                    }
                  }}
                />
                <div className="flex items-center justify-end gap-3">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setConfirmFullReset({ isOpen: false, step: 1 })
                      setResetConfirmationText('')
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary bg-red-600 hover:bg-red-700"
                    onClick={handleFullResetConfirm}
                    disabled={resetConfirmationText.trim().toUpperCase() !== 'RESET'}
                  >
                    Confirm Reset
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmClearLocal}
        title="⚠️ Clear All Local Data"
        message="This will delete ALL local data including invoices, customers, products, and purchases. This action CANNOT be undone!"
        confirmLabel="Clear Data"
        confirmVariant="danger"
        onClose={() => setConfirmClearLocal(false)}
        onConfirm={() => {
          setConfirmClearLocal(false)
          handleClearLocal()
        }}
      />

      <ConfirmModal
        isOpen={confirmClearPending}
        title="Clear Pending Invoices"
        message={`Clear ${pendingInvoices.length} pending invoice(s) from sync queue?`}
        confirmLabel="Clear"
        confirmVariant="danger"
        onClose={() => setConfirmClearPending(false)}
        onConfirm={() => {
          setConfirmClearPending(false)
          handleClearPending()
        }}
      />

      <ConfirmModal
        isOpen={confirmDeleteUser.isOpen}
        title="Delete User"
        message={`Delete user "${confirmDeleteUser.username}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onClose={() => setConfirmDeleteUser({ isOpen: false, userId: null, username: '' })}
        onConfirm={handleDeleteUserConfirm}
      />
    </div>
  )
}

