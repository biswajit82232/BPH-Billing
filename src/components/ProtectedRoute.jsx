import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

export default function ProtectedRoute({ children, pageKey }) {
  const { settings } = useData()
  const { hasPermission } = useAuth()

  // If login gate is disabled, allow access
  if (!settings.enableLoginGate) {
    return children
  }

  // Check if user has permission for this page
  if (!hasPermission(pageKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full glass-panel p-6 border border-red-200">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-sm text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}

