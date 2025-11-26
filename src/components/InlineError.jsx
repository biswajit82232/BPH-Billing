/**
 * Inline Error Message Component
 * Shows error messages below form fields
 */
export default function InlineError({ error, className = '' }) {
  if (!error) return null

  return (
    <p 
      className={`text-xs text-red-600 mt-1 flex items-center gap-1 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <svg 
        className="w-3 h-3 flex-shrink-0" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <span>{error}</span>
    </p>
  )
}

