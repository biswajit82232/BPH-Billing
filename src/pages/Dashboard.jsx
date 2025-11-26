import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import StatsCard from '../components/StatsCard'
import PageHeader from '../components/PageHeader'
import { useData } from '../context/DataContext'
import { formatCurrency } from '../lib/taxUtils'
import { calculateTotalReceivables } from '../utils/calculateReceivables'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'
import { DashboardStatsSkeleton } from '../components/LoadingSkeleton'

export default function Dashboard() {
  const { invoices, products, calculateDistributorPayables, refreshData, loading } = useData()
  const navigate = useNavigate()
  const monthKey = format(new Date(), 'yyyy-MM')
  const [showProfitDetails, setShowProfitDetails] = useState(false)
  const pullToRefresh = usePullToRefresh({ onRefresh: refreshData })

  // Create products map for O(1) lookup instead of O(n) find()
  const productsMap = useMemo(() => {
    const map = new Map()
    products.forEach(p => map.set(p.id, p))
    return map
  }, [products])

  const distributorPayables = useMemo(() => calculateDistributorPayables(), [calculateDistributorPayables])
  const totalDistributorPayables = useMemo(() => 
    distributorPayables.reduce((sum, entry) => sum + entry.totalOwed, 0),
    [distributorPayables]
  )

  const { totals, lowStock, allTimeReceivables, profit, totalCost, distributorCost, otherCost } = useMemo(() => {
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
    
    // Calculate profit: Revenue (sales) - Cost of Goods Sold
    // Optimized with productsMap for O(1) lookup instead of O(n) find()
    let totalCost = 0
    let distributorCost = 0
    let otherCost = 0
    
    for (const invoice of monthly) {
      if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
          const qty = Number(item.qty) || 0
          const rate = Number(item.rate) || 0
          
          let costPrice = Number(item.costPrice) || 0
          let isDistributorItem = false
          
          // Use map lookup instead of find() - much faster!
          if (item.productId && productsMap.has(item.productId)) {
            const product = productsMap.get(item.productId)
            isDistributorItem = !!product.distributorId
              if (!costPrice && product.cost_price) {
                costPrice = Number(product.cost_price) || 0
            }
          }
          
          if (!costPrice) {
            costPrice = rate * 0.8
          }
          
          const itemCost = qty * costPrice
          totalCost += itemCost
          
          if (isDistributorItem) {
            distributorCost += itemCost
          } else {
            otherCost += itemCost
          }
        }
      }
    }
    
    const profit = totals.sales - totalCost
    const lowStock = products.filter((product) => product.stock < 5)
    const allTimeReceivables = calculateTotalReceivables(invoices)
    return { monthlyInvoices: monthly, totals, lowStock, allTimeReceivables, profit, totalCost, distributorCost, otherCost }
  }, [invoices, productsMap, monthKey, products])


  // Show skeleton while loading initial data
  if (loading && invoices.length === 0 && products.length === 0) {
    return (
      <div className="space-y-4 w-full relative">
        <PullToRefreshIndicator state={pullToRefresh} />
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back! Here's your business overview"
          action={() => navigate('/invoices/new')}
          actionLabel="Create Invoice"
          actionIcon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        />
        <DashboardStatsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full relative">
      <PullToRefreshIndicator state={pullToRefresh} />
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's your business overview"
        action={() => navigate('/invoices/new')}
        actionLabel="Create Invoice"
        actionIcon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <StatsCard label="Total Invoices" value={invoices.length} />
        <StatsCard
          label="Sales This Month"
          value={formatCurrency(totals.sales)}
          subtitle={`Paid ${formatCurrency(totals.paid)}`}
          highlight
        />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <StatsCard 
          label="Total Receivables" 
          value={formatCurrency(allTimeReceivables)}
          subtitle="Across all invoices"
        />
        <div 
          onClick={() => setShowProfitDetails(true)}
          className="cursor-pointer"
        >
          <StatsCard 
            label="Profit This Month" 
            value={formatCurrency(profit)}
            subtitle={profit >= 0 ? "Margin after distributor costs" : "Loss"}
          />
        </div>
        <div onClick={() => navigate('/distributors/payables')} className="cursor-pointer">
          <StatsCard
            label="Distributor Payables"
            value={formatCurrency(totalDistributorPayables)}
            subtitle="Tap to view details"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <StatsCard label="CGST (this month)" value={formatCurrency(totals.cgst)} />
        <StatsCard label="SGST (this month)" value={formatCurrency(totals.sgst)} />
        <StatsCard label="IGST (this month)" value={formatCurrency(totals.igst)} />
        <StatsCard label="Low Stock Items" value={lowStock.length} subtitle="Below 5 units" />
      </section>

      <section className="glass-panel p-3">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Link className="btn-secondary text-center" to="/invoices">
            <span className="hidden sm:inline">View All Invoices</span>
            <span className="sm:hidden">Invoices</span>
          </Link>
          <Link className="btn-secondary text-center" to="/gst-report">
            <span className="hidden sm:inline">GST Report</span>
            <span className="sm:hidden">GST</span>
          </Link>
          <Link className="btn-secondary text-center" to="/aging-report">
            <span className="hidden sm:inline">Aging Report</span>
            <span className="sm:hidden">Aging</span>
          </Link>
          <Link className="btn-secondary text-center" to="/distributors/payables">
            Payables
          </Link>
          <Link className="btn-secondary text-center" to="/backup">
            Settings
          </Link>
        </div>
      </section>

      {/* Profit Details Modal */}
      {showProfitDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowProfitDetails(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Profit Breakdown</h3>
              <button
                onClick={() => setShowProfitDetails(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">Total Revenue (Sales)</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(totals.sales)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">Total Cost (COGS)</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(totalCost)}</span>
              </div>
              
              {distributorCost > 0 && (
                <div className="pl-4 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Distributor Costs:</span>
                    <span className="font-medium">{formatCurrency(distributorCost)}</span>
                  </div>
                  {otherCost > 0 && (
                    <div className="flex justify-between">
                      <span>Other Costs:</span>
                      <span className="font-medium">{formatCurrency(otherCost)}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-base font-semibold text-gray-900">Net Profit / Loss</span>
                <span className={`text-xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(profit)}
                </span>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> Profit shows your margin after distributor costs. Cost is calculated from product cost prices (distributor cost_price for distributor items). If cost price is not available, it's estimated as 80% of selling price.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

