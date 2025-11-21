/**
 * Consistent Page Header Component
 * Ensures uniform styling across all pages (Zoho-style)
 */

export default function PageHeader({ 
  title, 
  subtitle, 
  action, 
  actionLabel, 
  actionIcon,
  secondaryAction,
  secondaryLabel 
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-row justify-end gap-1.5 sm:gap-2 w-full sm:w-auto flex-shrink-0">
          {secondaryAction && (
            <button 
              onClick={secondaryAction} 
              className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
            >
              {secondaryLabel}
            </button>
          )}
          {action && (
            <button 
              onClick={action} 
              className="btn-primary flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
            >
              {actionIcon && (
                <span className="flex items-center justify-center flex-shrink-0">
                  {actionIcon}
                </span>
              )}
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

