export default function PullToRefreshIndicator({ state }) {
  if (!state || (!state.isPulling && !state.isRefreshing)) return null

  const distance = state.distance || 0
  const scale = Math.min(1 + distance / 200, 1.1)
  const rotation = Math.min(distance * 2.5, 180)

  return (
    <div
      className="fixed top-4 left-1/2 z-50 md:hidden"
      style={{
        opacity: Math.min(distance / 40, 1),
        transform: `translate(-50%, ${Math.max(0, distance - 40)}px)`,
        transition: state.isRefreshing
          ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out'
          : 'none',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className="bg-white rounded-full p-2 shadow-lg transition-all duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        {state.isRefreshing ? (
          <svg
            className="animate-spin h-6 w-6 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6 text-blue-600"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
      </div>
    </div>
  )
}

