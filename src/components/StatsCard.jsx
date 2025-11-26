import { memo } from 'react'

function StatsCard({ label, value, subtitle, highlight = false, className = '' }) {
  return (
    <div
      className={`glass-panel p-2.5 sm:p-3 transition-all duration-200 ${className} ${
        highlight
          ? 'bg-gradient-to-br from-brand-primary to-blue-700 text-white border-brand-primary shadow-md hover:shadow-lg'
          : 'bg-white text-gray-900 hover:shadow-md'
      }`}
    >
      <p
        className={`text-[9px] sm:text-[10px] uppercase tracking-wide font-semibold mb-1 ${
          highlight ? 'text-white/90' : 'text-gray-500'
        }`}
      >
        {label}
      </p>
      <p className={`text-base sm:text-xl md:text-2xl font-bold leading-tight ${highlight ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-[9px] sm:text-[10px] mt-1 ${highlight ? 'text-white/90' : 'text-gray-600'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default memo(StatsCard)

