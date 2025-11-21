import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import StatsCard from '../components/StatsCard'
import PageHeader from '../components/PageHeader'
import { useData } from '../context/DataContext'
import { formatCurrency } from '../lib/taxUtils'
import { calculateTotalReceivables } from '../utils/calculateReceivables'

export default function Dashboard() {
  const { invoices, products, activity } = useData()
  const navigate = useNavigate()
  const monthKey = format(new Date(), 'yyyy-MM')

  const { totals, lowStock, allTimeReceivables } = useMemo(() => {
    const monthly = invoices.filter((inv) => inv.date?.startsWith(monthKey))
    const totals = monthly.reduce(
      (acc, invoice) => {
        const value = invoice.totals?.grandTotal || 0
        acc.sales += value
        acc.cgst += invoice.totals?.cgst || 0
        acc.sgst += invoice.totals?.sgst || 0
        acc.igst += invoice.totals?.igst || 0
        if (invoice.status === 'paid') acc.paid += value
        return acc
      },
      { sales: 0, paid: 0, cgst: 0, sgst: 0, igst: 0 },
    )
    const lowStock = products.filter((product) => product.stock < 5)
    const allTimeReceivables = calculateTotalReceivables(invoices)
    return { monthlyInvoices: monthly, totals, lowStock, allTimeReceivables }
  }, [invoices, products, monthKey])

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's your business overview"
        action={() => navigate('/invoices/new')}
        actionLabel="Create Invoice"
        actionIcon={
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <StatsCard label="Total Invoices" value={invoices.length} />
        <StatsCard
          label="Sales This Month"
          value={formatCurrency(totals.sales)}
          subtitle={`Paid ${formatCurrency(totals.paid)}`}
          highlight
        />
        <StatsCard 
          label="Total Receivables" 
          value={formatCurrency(allTimeReceivables)}
          subtitle="Across all invoices"
          className="col-span-2 md:col-span-1"
        />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard label="CGST (this month)" value={formatCurrency(totals.cgst)} />
        <StatsCard label="SGST (this month)" value={formatCurrency(totals.sgst)} />
        <StatsCard label="IGST (this month)" value={formatCurrency(totals.igst)} />
        <StatsCard label="Low Stock Items" value={lowStock.length} subtitle="Below 5 units" />
      </section>

      <section className="glass-panel p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <Link className="btn-secondary text-center text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" to="/invoices">
            <span className="hidden sm:inline">View All Invoices</span>
            <span className="sm:hidden">Invoices</span>
          </Link>
          <Link className="btn-secondary text-center text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" to="/gst-report">
            <span className="hidden sm:inline">GST Report</span>
            <span className="sm:hidden">GST</span>
          </Link>
          <Link className="btn-secondary text-center text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" to="/aging-report">
            <span className="hidden sm:inline">Aging Report</span>
            <span className="sm:hidden">Aging</span>
          </Link>
          <Link className="btn-secondary text-center text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" to="/backup">
            Settings
          </Link>
        </div>
      </section>

      <section className="glass-panel p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Recent Activity</h2>
        <div className="space-y-0">
          {activity.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-start sm:items-center py-3 border-b border-gray-100 last:border-0 gap-3"
            >
              <span className="text-sm text-gray-700 flex-1 min-w-0 leading-snug">{item.action}</span>
              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 leading-snug">{item.date}</span>
            </div>
          ))}
          {!activity.length && <p className="text-sm text-gray-500 py-4 text-center">No recent activity</p>}
        </div>
      </section>
    </div>
  )
}

