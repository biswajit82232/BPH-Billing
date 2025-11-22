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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-row justify-end gap-1.5 w-full sm:w-auto flex-shrink-0">
          {secondaryAction && (
            <button 
              onClick={secondaryAction} 
              className="btn-secondary whitespace-nowrap"
            >
              {secondaryLabel}
            </button>
          )}
          {action && (
            <button 
              onClick={action} 
              className="btn-primary flex items-center justify-center gap-1.5 whitespace-nowrap"
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

