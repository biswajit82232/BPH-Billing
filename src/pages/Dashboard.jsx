import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import StatsCard from '../components/StatsCard'
import PageHeader from '../components/PageHeader'
import { useData } from '../context/DataContext'
import { formatCurrency } from '../lib/taxUtils'
import { calculateTotalReceivables } from '../utils/calculateReceivables'
import { safeReload } from '../utils/reloadGuard'

export default function Dashboard() {
  const { invoices, products } = useData()
  const navigate = useNavigate()
  const monthKey = format(new Date(), 'yyyy-MM')
  
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
    <div className="space-y-4 w-full relative">
      {/* Pull to refresh indicator */}
      {(pullToRefresh.isPulling || pullToRefresh.isRefreshing) && (
        <div 
          className="fixed top-4 left-1/2 z-50 md:hidden"
          style={{ 
            opacity: Math.min(pullToRefresh.distance / 40, 1),
            transform: `translate(-50%, ${Math.max(0, pullToRefresh.distance - 40)}px)`,
            transition: pullToRefresh.isRefreshing 
              ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out' 
              : 'none',
            willChange: 'transform, opacity'
          }}
        >
          <div 
            className="bg-white rounded-full p-2 shadow-lg transition-all duration-200"
            style={{
              transform: `scale(${Math.min(1 + (pullToRefresh.distance / 200), 1.1)})`
            }}
          >
            {pullToRefresh.isRefreshing ? (
              <svg 
                className="animate-spin h-6 w-6 text-blue-600" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg 
                className="h-6 w-6 text-blue-600"
                style={{
                  transform: `rotate(${Math.min(pullToRefresh.distance * 2.5, 180)}deg)`,
                  transition: 'transform 0.15s ease-out'
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
      )}
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
        <StatsCard 
          label="Total Receivables" 
          value={formatCurrency(allTimeReceivables)}
          subtitle="Across all invoices"
          className="col-span-2 md:col-span-1"
        />
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
          <Link className="btn-secondary text-center" to="/backup">
            Settings
          </Link>
        </div>
      </section>

    </div>
  )
}

