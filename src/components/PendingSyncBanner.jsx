import { useData } from '../context/DataContext'

export default function PendingSyncBanner() {
  const { pendingInvoices, syncing, online } = useData()
  const hasPending = pendingInvoices.length > 0

  if (!hasPending && online) return null

  return (
    <div
      className={`px-6 py-2.5 text-sm border-b ${
        online
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <p className="font-medium text-sm">
          {online
            ? `${pendingInvoices.length} invoice(s) waiting to sync with Firebase`
            : 'You are offline. New invoices will queue locally until you reconnect.'}
        </p>
        <div className="text-xs flex items-center gap-2">
          {syncing && <span>Syncing…</span>}
          {!online && <span>Offline mode</span>}
        </div>
      </div>
    </div>
  )
}

