export default function LoadingState({ progress = 0 }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/30"
      role="status"
      aria-live="polite"
      aria-label={`Loading: ${progress}% complete`}
      style={{
        animation: 'fade-in 0.2s ease-out',
        willChange: 'opacity',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      {/* Very tiny horizontal progress bar - no white border */}
      <div className="w-full max-w-[160px] mx-4">
        {/* Progress Bar Container - directly visible */}
        <div className="relative w-full h-3 bg-gray-200/80 backdrop-blur-sm rounded-full overflow-hidden shadow-lg">
          {/* Progress Fill */}
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full relative overflow-hidden"
            style={{ 
              width: `${progress}%`,
              transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'width'
            }}
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{
                transform: 'translateX(-100%)',
                animation: 'shimmer 2s ease-in-out infinite',
                willChange: 'transform'
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
