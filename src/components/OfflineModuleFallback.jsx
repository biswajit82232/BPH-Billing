import { useEffect, useState, useCallback } from 'react'

export default function OfflineModuleFallback({ featureName = 'this feature' }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m6 14h6m-6 0v2m0-2a6 6 0 01-6 0m6 0a6 6 0 006 0M3 19h6m-6 0v2m0-2a6 6 0 016 0m-6 0a6 6 0 006 0M3 9h18M3 9v6m18-6v6" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Can't load {featureName}</h2>
      <p className="text-gray-600 max-w-md">
        This screen needs additional code that isn't cached yet. Please reconnect to the internet and tap retry to load it.
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Status: {online ? 'Connection detected' : 'Offline'}
      </p>
      <button
        onClick={handleRetry}
        className="btn-primary mt-4"
      >
        Retry Loading
      </button>
    </div>
  )
}


