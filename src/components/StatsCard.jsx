import { memo } from 'react'

function StatsCard({ label, value, subtitle, highlight = false, className = '' }) {
  return (
    <div
      className={`glass-panel p-3 sm:p-5 md:p-6 transition-all duration-200 ${className} ${
        highlight
          ? 'bg-gradient-to-br from-brand-primary to-blue-700 text-white border-brand-primary shadow-lg hover:shadow-xl'
          : 'bg-white text-gray-900 hover:scale-105'
      }`}
    >
      <p
        className={`text-[10px] sm:text-xs uppercase tracking-wide font-semibold mb-1 sm:mb-2 ${
          highlight ? 'text-white/90' : 'text-gray-500'
        }`}
      >
        {label}
      </p>
      <p className={`text-lg sm:text-2xl md:text-3xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-[10px] sm:text-sm mt-1 sm:mt-2 ${highlight ? 'text-white/90' : 'text-gray-600'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default memo(StatsCard)

