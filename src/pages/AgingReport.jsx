import { useMemo, useState, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import PageHeader from '../components/PageHeader'
import { formatCurrency } from '../lib/taxUtils'
import { differenceInDays, parseISO, format } from 'date-fns'
import { safeReload } from '../utils/reloadGuard'

export default function AgingReport() {
  const { invoices, customers } = useData()
  const [selectedCustomer, setSelectedCustomer] = useState('all')
  
  // Pull to refresh state
  const [pullToRefresh, setPullToRefresh] = useState({ 
    isPulling: false, 
    startY: 0, 
    distance: 0, 
    isRefreshing: false 
  })
  const pullStartRef = useRef(null)

  // Pull to refresh functionality (mobile only, upper 1/3)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let currentDistance = 0
    let rafId = null
    
    const handleTouchStart = (e) => {
      if (window.innerWidth > 768) return
      const touch = e.touches[0]
      const startY = touch.clientY
      const scrollY = window.scrollY || document.documentElement.scrollTop
      
      if (startY > window.innerHeight / 3) return
      if (scrollY > 10) return
      
      pullStartRef.current = { startY, startScrollY: scrollY }
      currentDistance = 0
      setPullToRefresh({ isPulling: false, startY, distance: 0, isRefreshing: false })
    }

    const updatePullState = () => {
      if (!pullStartRef.current) return
      const distance = Math.min(currentDistance, 80)
      setPullToRefresh(prev => ({
        ...prev,
        isPulling: currentDistance > 5,
        distance: distance
      }))
    }

    const handleTouchMove = (e) => {
      if (!pullStartRef.current) return
      if (window.innerWidth > 768) return
      
      const touch = e.touches[0]
      const currentY = touch.clientY
      const newDistance = Math.max(0, currentY - pullStartRef.current.startY)
      
      currentDistance = currentDistance + (newDistance - currentDistance) * 0.3
      
      if (currentDistance > 0 && currentDistance < 100) {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          updatePullState()
          if (currentDistance > 5 && currentDistance < 100) {
            rafId = requestAnimationFrame(updatePullState)
          }
        })
        
        if (currentDistance > 10) e.preventDefault()
      } else {
        if (rafId) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      }
    }

    const handleTouchEnd = (e) => {
      if (!pullStartRef.current) return
      if (window.innerWidth > 768) return
      
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      
      if (currentDistance > 60) {
        setPullToRefresh(prev => ({ ...prev, isRefreshing: true, isPulling: false, distance: 70 }))
        safeReload(300)
      } else {
        const startDistance = currentDistance
        const startTime = performance.now()
        const duration = 300
        
        const animateReturn = (currentTime) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          
          const newDistance = startDistance * (1 - eased)
          setPullToRefresh(prev => ({ 
            ...prev, 
            isPulling: newDistance > 5, 
            distance: newDistance 
          }))
          
          if (progress < 1) {
            requestAnimationFrame(animateReturn)
          } else {
            setPullToRefresh(prev => ({ ...prev, isPulling: false, distance: 0 }))
          }
        }
        
        requestAnimationFrame(animateReturn)
      }
      
      currentDistance = 0
      pullStartRef.current = null
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])
  
  const handleCustomerClick = (customerId) => {
    if (selectedCustomer === customerId) {
      setSelectedCustomer('all') // Toggle off if already selected
    } else {
      setSelectedCustomer(customerId) // Select this customer
    }
  }

  const agingData = useMemo(() => {
    const today = new Date()
    
    // Filter unpaid/sent invoices
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status !== 'paid' && inv.status !== 'draft'
    )

    // Group by customer
    const customerMap = {}
    
    unpaidInvoices.forEach((invoice) => {
      // Calculate outstanding amount (total - paid)
      const total = invoice.totals?.grandTotal || 0
      const paid = invoice.amountPaid || 0
      const outstanding = Math.max(0, total - paid)
      
      // Only include if there's outstanding amount
      if (outstanding <= 0) return
      
      const customerId = invoice.customerId || 'walk-in'
      const customerName = invoice.customerName || 'Walk-in Customer'
      
      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          id: customerId,
          name: customerName,
          invoices: [],
          total: 0,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          days90Plus: 0,
        }
      }

      // Use dueDate if available, otherwise invoice date
      const referenceDate = invoice.dueDate ? parseISO(invoice.dueDate) : parseISO(invoice.date)
      const daysOverdue = differenceInDays(today, referenceDate)

      customerMap[customerId].invoices.push({
        ...invoice,
        daysOverdue,
        outstanding,
      })
      customerMap[customerId].total += outstanding

      // Categorize by aging bucket based on due date
      if (daysOverdue <= 0) {
        customerMap[customerId].current += outstanding
      } else if (daysOverdue <= 30) {
        customerMap[customerId].days1_30 += outstanding
      } else if (daysOverdue <= 60) {
        customerMap[customerId].days31_60 += outstanding
      } else if (daysOverdue <= 90) {
        customerMap[customerId].days61_90 += outstanding
      } else {
        customerMap[customerId].days90Plus += outstanding
      }
    })

    const customerList = Object.values(customerMap).sort((a, b) => b.total - a.total)
    
    // Calculate totals
    const totals = customerList.reduce(
      (acc, customer) => ({
        total: acc.total + customer.total,
        current: acc.current + customer.current,
        days1_30: acc.days1_30 + customer.days1_30,
        days31_60: acc.days31_60 + customer.days31_60,
        days61_90: acc.days61_90 + customer.days61_90,
        days90Plus: acc.days90Plus + customer.days90Plus,
      }),
      { total: 0, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0 }
    )

    return { customerList, totals }
  }, [invoices])

  const filteredData = useMemo(() => {
    if (selectedCustomer === 'all') {
      return agingData.customerList
    }
    return agingData.customerList.filter((c) => c.id === selectedCustomer)
  }, [agingData.customerList, selectedCustomer])

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
          title="Aging Report"
          subtitle="Track overdue invoices and receivables by aging bucket"
        />
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className="w-full sm:w-auto"
        >
          <option value="all">All Customers</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-panel p-4 bg-gradient-to-br from-blue-50 to-white">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Receivables</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(agingData.totals.total)}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Current</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(agingData.totals.current)}</p>
        </div>
        <div className="glass-panel p-4 bg-gradient-to-br from-yellow-50 to-white">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">1-30 Days</p>
          <p className="text-lg font-semibold text-yellow-700">{formatCurrency(agingData.totals.days1_30)}</p>
        </div>
        <div className="glass-panel p-4 bg-gradient-to-br from-orange-50 to-white">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">31-60 Days</p>
          <p className="text-lg font-semibold text-orange-700">{formatCurrency(agingData.totals.days31_60)}</p>
        </div>
        <div className="glass-panel p-4 bg-gradient-to-br from-red-50 to-white">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">61-90 Days</p>
          <p className="text-lg font-semibold text-red-700">{formatCurrency(agingData.totals.days61_90)}</p>
        </div>
        <div className="glass-panel p-4 bg-gradient-to-br from-red-100 to-white">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">90+ Days</p>
          <p className="text-lg font-semibold text-red-900">{formatCurrency(agingData.totals.days90Plus)}</p>
        </div>
      </div>

      {/* Customer-wise Aging Table */}
      <section className="glass-panel overflow-x-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer-wise Aging</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Oldest Due Date</th>
                  <th className="text-right">Total Due</th>
                  <th className="text-right">Current</th>
                  <th className="text-right">1-30 Days</th>
                  <th className="text-right">31-60 Days</th>
                  <th className="text-right">61-90 Days</th>
                  <th className="text-right">90+ Days</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((customer) => {
                  // Find oldest due date
                  const oldestInvoice = customer.invoices
                    .filter(inv => inv.dueDate || inv.date)
                    .sort((a, b) => {
                      const dateA = a.dueDate || a.date
                      const dateB = b.dueDate || b.date
                      return new Date(dateA) - new Date(dateB)
                    })[0]
                  const oldestDueDate = oldestInvoice ? (oldestInvoice.dueDate || oldestInvoice.date) : '--'
                  
                  return (
                    <tr 
                      key={customer.id}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedCustomer === customer.id ? 'bg-blue-50' : ''}`}
                      onClick={() => handleCustomerClick(customer.id)}
                    >
                      <td className="font-medium text-brand-primary hover:underline">{customer.name}</td>
                      <td className="text-gray-600">
                        {oldestDueDate !== '--' ? format(new Date(oldestDueDate), 'dd MMM yyyy') : '--'}
                      </td>
                    <td className="text-right font-semibold text-gray-900">{formatCurrency(customer.total)}</td>
                    <td className="text-right text-gray-600">{formatCurrency(customer.current)}</td>
                    <td className="text-right text-yellow-700">{formatCurrency(customer.days1_30)}</td>
                    <td className="text-right text-orange-700">{formatCurrency(customer.days31_60)}</td>
                    <td className="text-right text-red-700">{formatCurrency(customer.days61_90)}</td>
                    <td className="text-right text-red-900 font-semibold">{formatCurrency(customer.days90Plus)}</td>
                  </tr>
                  )
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-500">
                      No outstanding invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Invoice Details */}
      {selectedCustomer !== 'all' && filteredData.length > 0 && (
        <section className="glass-panel">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Invoice Details - {filteredData[0]?.name || 'Customer'}
              </h3>
              <button
                onClick={() => setSelectedCustomer('all')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Invoice No</th>
                    <th className="text-left">Invoice Date</th>
                    <th className="text-left">Due Date</th>
                    <th className="text-right">Total Amount</th>
                    <th className="text-right">Amount Paid</th>
                    <th className="text-right">Outstanding</th>
                    <th className="text-right">Days Overdue</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData[0].invoices
                    .sort((a, b) => b.daysOverdue - a.daysOverdue)
                    .map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="font-medium text-brand-primary">{invoice.invoiceNo}</td>
                        <td className="text-gray-600">{format(new Date(invoice.date), 'dd MMM yyyy')}</td>
                        <td className={`font-medium ${
                          invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.outstanding > 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : '--'}
                        </td>
                        <td className="text-right font-medium text-gray-900">{formatCurrency(invoice.totals?.grandTotal || 0)}</td>
                        <td className="text-right text-green-600">{formatCurrency(invoice.amountPaid || 0)}</td>
                        <td className="text-right font-semibold text-red-600">{formatCurrency(invoice.outstanding || (invoice.totals?.grandTotal || 0) - (invoice.amountPaid || 0))}</td>
                        <td
                          className={`text-right font-medium ${
                            invoice.daysOverdue > 90
                              ? 'text-red-900'
                              : invoice.daysOverdue > 60
                                ? 'text-red-700'
                                : invoice.daysOverdue > 30
                                  ? 'text-orange-700'
                                  : invoice.daysOverdue > 0
                                    ? 'text-yellow-700'
                                    : 'text-gray-600'
                          }`}
                        >
                          {invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : 'Not due'}
                        </td>
                        <td>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                              invoice.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

