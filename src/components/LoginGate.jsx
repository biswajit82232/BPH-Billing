import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { BRAND } from '../data/branding'
import { clearAllLocalStorage } from '../lib/storage'

export default function LoginGate({ children }) {
  const { settings } = useData()
  const { currentUser, login, logout } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [showClearData, setShowClearData] = useState(false)

  // If login gate is disabled, show children directly
  if (!settings.enableLoginGate) {
    return children
  }

  // If user is logged in, show app (logout is handled in Layout sidebar)
  if (currentUser) {
    return children
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    
    const result = login(form.username, form.password)
    if (result.success) {
      setForm({ username: '', password: '' })
    } else {
      setError(result.error || 'Invalid username or password')
    }
  }

  const handleClearAllData = () => {
    if (window.confirm('⚠️ WARNING: This will delete ALL local data including:\n\n• All invoices\n• All customers\n• All products\n• All purchases\n• All settings\n• All users\n• All activity logs\n• All pending syncs\n• All session data\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?')) {
      clearAllLocalStorage()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <img 
                src="/logo.png" 
                alt={BRAND.name}
                className="w-24 h-24 object-contain relative z-10"
                style={{ 
                  backgroundColor: 'transparent',
                  filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1)) drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1)) drop-shadow(0 20px 25px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 0 1px rgba(255, 255, 255, 0.1))',
                }}
                onError={(e) => {
                  // Fallback to the "B" letter if logo.png fails to load
                  e.target.style.display = 'none'
                  const parent = e.target.parentElement
                  parent.innerHTML = '<div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-primary to-blue-600 rounded-2xl shadow-2xl"><span class="text-white font-bold text-3xl">B</span></div>'
                }}
              />
              {/* Material design shadow layers */}
              <div 
                className="absolute inset-0 rounded-full blur-xl opacity-30"
                style={{
                  background: 'radial-gradient(circle, rgba(0, 114, 206, 0.4) 0%, transparent 70%)',
                  transform: 'translateY(4px) scale(1.1)',
                  zIndex: 0,
                }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{BRAND.name}</h1>
          <p className="text-sm text-gray-600">{BRAND.tagline}</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 border border-gray-200 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Login</h2>
            <p className="text-sm text-gray-600">
              Enter your credentials to access the application
            </p>
          </div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Username
                </div>
              </label>
              <div className="relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
          <input
                  type="text"
                  className="w-full pl-10"
                  placeholder="Enter your username"
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  required
                  autoFocus
                  style={{ paddingLeft: '2.5rem' }}
          />
        </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Password
                </div>
              </label>
              <div className="relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
          <input
            type="password"
                  className="w-full pl-10"
                  placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  style={{ paddingLeft: '2.5rem' }}
          />
        </div>
            </div>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}
            <button type="submit" className="btn-primary w-full py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </span>
        </button>
      </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowClearData(!showClearData)}
              className="text-xs text-gray-500 hover:text-gray-700 w-full text-center"
            >
              {showClearData ? 'Hide' : 'Show'} Advanced Options
            </button>
            
            {showClearData && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-800 mb-2">⚠️ Danger Zone</p>
                <p className="text-xs text-red-700 mb-3">
                  Clear all local data stored in your browser. This includes invoices, customers, products, purchases, settings, users, and activity logs.
                </p>
                <button
                  type="button"
                  onClick={handleClearAllData}
                  className="btn-danger w-full text-xs py-2"
                >
                  Clear All Local Data
                </button>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-6 text-center">
            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Credentials are managed by Owner. All data is stored securely.
      </p>
        </div>
      </div>
    </div>
  )
}
