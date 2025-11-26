/**
 * Loading Skeleton Components - Better UX than progress bars
 */

// Generic skeleton base
const Skeleton = ({ className = '', width, height }) => (
  <div
    className={`bg-gray-200 animate-pulse rounded ${className}`}
    style={{
      width: width || '100%',
      height: height || '1rem',
    }}
    aria-hidden="true"
  />
)

// Invoice list skeleton
export function InvoiceListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton width="120px" height="1rem" />
            <Skeleton width="80px" height="1rem" />
          </div>
          <Skeleton width="200px" height="0.875rem" className="mb-2" />
          <div className="flex gap-4 mt-3">
            <Skeleton width="100px" height="0.75rem" />
            <Skeleton width="100px" height="0.75rem" />
            <Skeleton width="100px" height="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Dashboard stats skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-panel p-4">
          <Skeleton width="80px" height="0.875rem" className="mb-2" />
          <Skeleton width="120px" height="1.5rem" className="mb-1" />
          <Skeleton width="100px" height="0.75rem" />
        </div>
      ))}
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-2">
                <Skeleton height="0.875rem" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-3 py-2">
                  <Skeleton height="0.75rem" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Form skeleton
export function FormSkeleton({ fields = 6 }) {
  return (
    <div className="glass-panel p-4 md:p-6 space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton width="120px" height="0.875rem" className="mb-2" />
          <Skeleton height="2.5rem" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton width="100px" height="2.5rem" />
        <Skeleton width="100px" height="2.5rem" />
      </div>
    </div>
  )
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="glass-panel p-4">
      <Skeleton width="150px" height="1.25rem" className="mb-3" />
      <Skeleton height="0.875rem" className="mb-2" />
      <Skeleton height="0.875rem" className="mb-2" />
      <Skeleton width="80%" height="0.875rem" />
    </div>
  )
}

// Export default generic skeleton
export default Skeleton

