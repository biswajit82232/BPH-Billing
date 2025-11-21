export default function LoadingState({ progress = 0 }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/20">
      {/* Very tiny horizontal progress bar - no white border */}
      <div className="w-full max-w-[160px] mx-4">
        {/* Progress Bar Container - directly visible */}
        <div className="relative w-full h-3 bg-gray-200/80 backdrop-blur-sm rounded-full overflow-hidden shadow-lg">
          {/* Progress Fill */}
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
