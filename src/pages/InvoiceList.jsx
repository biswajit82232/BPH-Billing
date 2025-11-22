import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import PDFGenerator from '../components/PDFGenerator'
import WhatsAppShare from '../components/WhatsAppShare'
import PrintInvoice from '../components/PrintInvoice'
import ConfirmModal from '../components/ConfirmModal'
import InvoicePreviewModal from '../components/InvoicePreviewModal'
import PageHeader from '../components/PageHeader'
import EmptyState, { icons } from '../components/EmptyState'
import { useToast } from '../components/ToastContainer'
import { formatCurrency } from '../lib/taxUtils'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'

const ITEMS_PER_PAGE = 50

// SortIcon component moved outside to avoid creating during render
const SortIcon = ({ field, sortField, sortOrder }) => {
  if (sortField !== field) return <span className="text-gray-400 ml-1">↕</span>
  return <span className="text-brand-primary ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
}

export default function InvoiceList() {
  const { invoices, markInvoiceStatus, deleteInvoice } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const searchInputRef = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  // Read customer parameter from URL and set search
  useEffect(() => {
    const customerParam = searchParams.get('customerName')
    if (customerParam && customerParam !== search) {
      setTimeout(() => setSearch(customerParam), 0)
    }
  }, [searchParams, search])
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedInvoices, setSelectedInvoices] = useState([])
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, invoice: null })
  const [previewModal, setPreviewModal] = useState({ isOpen: false, invoice: null })
  const [showFilters, setShowFilters] = useState(false)
  const hasActiveFilters = status !== 'all' || from || to
  
  // Pull to refresh state
  const [pullToRefresh, setPullToRefresh] = useState({ 
    isPulling: false, 
    startY: 0, 
    distance: 0, 
    isRefreshing: false 
  })
  const pullStartRef = useRef(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setTimeout(() => setCurrentPage(1), 0)
    }
  }, [debouncedSearch, status, from, to, currentPage])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement
        if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Pull to refresh functionality (mobile only, upper half)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let currentDistance = 0
    let rafId = null
    
    const handleTouchStart = (e) => {
      // Only enable in mobile view (upper 1/3 of screen)
      if (window.innerWidth > 768) return
      const touch = e.touches[0]
      const startY = touch.clientY
      const scrollY = window.scrollY || document.documentElement.scrollTop
      
      // Only activate in upper 1/3 of viewport
      if (startY > window.innerHeight / 3) return
      
      // Only if scrolled to top
      if (scrollY > 10) return
      
      pullStartRef.current = { startY, startScrollY: scrollY }
      currentDistance = 0
      setPullToRefresh({ isPulling: false, startY, distance: 0, isRefreshing: false })
    }

    const updatePullState = () => {
      if (!pullStartRef.current) return
      
      const distance = Math.min(currentDistance, 80) // Cap at 80px
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
      
      // Smooth distance calculation with easing
      currentDistance = currentDistance + (newDistance - currentDistance) * 0.3
      
      // Only allow pull down
      if (currentDistance > 0 && currentDistance < 100) {
        if (rafId) {
          cancelAnimationFrame(rafId)
        }
        rafId = requestAnimationFrame(() => {
          updatePullState()
          if (currentDistance > 5 && currentDistance < 100) {
            rafId = requestAnimationFrame(updatePullState)
          }
        })
        
        // Prevent default scrolling when pulling
        if (currentDistance > 10) {
          e.preventDefault()
        }
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
      
      // Trigger refresh if pulled enough (60px threshold)
      if (currentDistance > 60) {
        setPullToRefresh(prev => ({ ...prev, isRefreshing: true, isPulling: false, distance: 70 }))
        
        // Use DataContext refresh instead of full page reload
        setTimeout(() => {
          window.location.reload()
        }, 300)
      } else {
        // Smooth return animation with easing
        const startDistance = currentDistance
        const startTime = performance.now()
        const duration = 300
        
        const animateReturn = (currentTime) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3) // Ease out cubic
          
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

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  // Quick filter functions
  const setQuickFilter = (filter) => {
    const today = new Date()
    switch (filter) {
      case 'today':
        setFrom(format(today, 'yyyy-MM-dd'))
        setTo(format(today, 'yyyy-MM-dd'))
        break
      case 'week':
        setFrom(format(startOfWeek(today), 'yyyy-MM-dd'))
        setTo(format(today, 'yyyy-MM-dd'))
        break
      case 'month':
        setFrom(format(startOfMonth(today), 'yyyy-MM-dd'))
        setTo(format(today, 'yyyy-MM-dd'))
        break
      case 'overdue':
        setTo(format(subDays(today, 1), 'yyyy-MM-dd'))
        setStatus('sent')
        break
      case 'all':
        setFrom('')
        setTo('')
        setStatus('all')
        break
    }
  }

  // Sort function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Bulk actions
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedInvoices(paginated.map((inv) => inv.id))
    } else {
      setSelectedInvoices([])
    }
  }

  const handleSelectInvoice = (invoiceId, checked) => {
    if (checked) {
      setSelectedInvoices([...selectedInvoices, invoiceId])
    } else {
      setSelectedInvoices(selectedInvoices.filter((id) => id !== invoiceId))
    }
  }

  const handleBulkMarkPaid = () => {
    selectedInvoices.forEach((id) => markInvoiceStatus(id, 'paid'))
    toast.success(`${selectedInvoices.length} invoices marked as paid`)
    setSelectedInvoices([])
  }

  const handleBulkDelete = () => {
    selectedInvoices.forEach((id) => deleteInvoice(id))
    toast.success(`${selectedInvoices.length} invoices deleted`)
    setSelectedInvoices([])
  }

  const handleDelete = (invoice) => {
    deleteInvoice(invoice.id)
    toast.success(`Invoice ${invoice.invoiceNo} deleted`)
    setDeleteModal({ isOpen: false, invoice: null })
  }

  const { filtered, paginated, totalPages, totalAmount } = useMemo(() => {
    let filtered = invoices.filter((invoice) => {
      const query = debouncedSearch.toLowerCase()
      const phone = invoice.phone || invoice.customer?.phone || ''
      const matchesSearch =
        !query ||
        invoice.invoiceNo.toLowerCase().includes(query) ||
        invoice.customerName.toLowerCase().includes(query) ||
        phone.includes(query)
      const matchesStatus = status === 'all' || invoice.status === status
      const matchesFrom = !from || new Date(invoice.date) >= new Date(from)
      const matchesTo = !to || new Date(invoice.date) <= new Date(to)
      return matchesSearch && matchesStatus && matchesFrom && matchesTo
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal
      switch (sortField) {
        case 'date':
          aVal = new Date(a.date).getTime()
          bVal = new Date(b.date).getTime()
          break
        case 'dueDate':
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : 0
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : 0
          break
        case 'invoiceNo':
          aVal = a.invoiceNo
          bVal = b.invoiceNo
          break
        case 'customer':
          aVal = a.customerName.toLowerCase()
          bVal = b.customerName.toLowerCase()
          break
        case 'total':
          aVal = a.totals?.grandTotal || 0
          bVal = b.totals?.grandTotal || 0
          break
        default:
          return 0
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })

    const totalAmount = filtered.reduce((sum, inv) => sum + (inv.totals?.grandTotal || 0), 0)
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    
    return { filtered, paginated, totalPages, totalAmount }
  }, [invoices, debouncedSearch, status, from, to, currentPage, sortField, sortOrder])

  return (
    <div className="space-y-2.5 sm:space-y-4 w-full relative">
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
                style={{
                  animation: 'spin 1s linear infinite'
                }}
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                ></circle>
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
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
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                />
              </svg>
            )}
          </div>
        </div>
      )}
      <PageHeader
        title="Invoices"
        subtitle={`${filtered.length} invoices • ${formatCurrency(totalAmount)} total value`}
        action={() => navigate('/invoices/new')}
        actionLabel="New Invoice"
        actionIcon={
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      />

      {/* Zoho-style Compact Search Bar */}
      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <div className="relative w-full max-w-xs sm:max-w-none sm:flex-1">
          <input
            ref={searchInputRef}
            className="w-full pr-7 sm:pr-8 text-xs sm:text-sm py-1.5 sm:py-2 pl-2.5 sm:pl-8"
            placeholder="Search by invoice, customer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="hidden sm:block w-4 sm:h-4 md:w-5 md:h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border transition-all flex items-center gap-1.5 text-xs ${
            hasActiveFilters
              ? 'bg-blue-50 border-brand-primary text-brand-primary'
              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {hasActiveFilters && <span className="w-1.5 h-1.5 bg-brand-primary rounded-full"></span>}
        </button>
      </div>

      {/* Collapsible Filters Panel */}
      {showFilters && (
        <section className="glass-panel p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mb-2.5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full" />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatus('all')
                  setFrom('')
                  setTo('')
                  setSearch('')
                }}
                className="btn-secondary w-full"
              >
                Clear All
              </button>
            </div>
          </div>
          {/* Quick Filters */}
          <div className="flex gap-1.5 pt-2.5 border-t border-gray-200">
            <button
              onClick={() => setQuickFilter('today')}
              className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            >
              Today
            </button>
            <button
              onClick={() => setQuickFilter('week')}
              className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            >
              This Week
            </button>
            <button
              onClick={() => setQuickFilter('month')}
              className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickFilter('overdue')}
              className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-all"
            >
              Overdue
            </button>
          </div>
        </section>
      )}

      {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <div className="glass-panel p-2.5 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-medium text-gray-900">{selectedInvoices.length} invoice(s) selected</p>
            <div className="flex gap-1.5">
              <button onClick={handleBulkMarkPaid} className="btn-success !py-1.5 !text-xs">
                Mark as Paid
              </button>
              <button onClick={() => setDeleteModal({ isOpen: true, invoice: { invoiceNo: `${selectedInvoices.length} invoices` } })} className="btn-danger !py-1.5 !text-xs">
                Delete Selected
              </button>
              <button onClick={() => setSelectedInvoices([])} className="btn-secondary !py-1.5 !text-xs">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop table view */}
      {paginated.length > 0 ? (
        <section className="glass-panel overflow-x-auto hidden md:block">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.length === paginated.length && paginated.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('invoiceNo')} role="columnheader" aria-sort={sortField === 'invoiceNo' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Invoice <SortIcon field="invoiceNo" sortField={sortField} sortOrder={sortOrder} />
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('customer')} role="columnheader" aria-sort={sortField === 'customer' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Customer <SortIcon field="customer" sortField={sortField} sortOrder={sortOrder} />
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')} role="columnheader" aria-sort={sortField === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Date <SortIcon field="date" sortField={sortField} sortOrder={sortOrder} />
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dueDate')} role="columnheader" aria-sort={sortField === 'dueDate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Due Date <SortIcon field="dueDate" sortField={sortField} sortOrder={sortOrder} />
                  </th>
                  <th className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total')} role="columnheader" aria-sort={sortField === 'total' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Total <SortIcon field="total" sortField={sortField} sortOrder={sortOrder} />
                  </th>
                  <th className="text-right cursor-pointer hover:bg-gray-100">
                    Outstanding
                  </th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((invoice) => (
                  <tr key={invoice.id} className={selectedInvoices.includes(invoice.id) ? 'bg-blue-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                    <td>
                      <Link 
                        to={`/invoices/${invoice.id}`} 
                        className="font-medium text-brand-primary hover:underline"
                      >
                        {invoice.invoiceNo}
                      </Link>
                    </td>
                    <td className="text-gray-900">{invoice.customerName}</td>
                    <td className="text-gray-600">{invoice.date}</td>
                    <td className="text-gray-600">
                      {invoice.dueDate || '--'}
                      {invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' && (
                        <span className="ml-2 text-red-600 text-xs">Overdue</span>
                      )}
                    </td>
                    <td className="text-right font-semibold text-gray-900">{formatCurrency(invoice.totals?.grandTotal)}</td>
                    <td className="text-right">
                      {(() => {
                        const total = invoice.totals?.grandTotal || 0
                        const paid = invoice.amountPaid || 0
                        const outstanding = Math.max(0, total - paid)
                        return (
                          <span className={`font-semibold ${
                            outstanding === 0 
                              ? 'text-gray-400' 
                              : 'text-gray-900'
                          }`}>
                            {formatCurrency(outstanding)}
                          </span>
                        )
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const total = invoice.totals?.grandTotal || 0
                        const paid = invoice.amountPaid || 0
                        const outstanding = Math.max(0, total - paid)
                        const isFullyPaid = outstanding === 0 && total > 0
                        const isPartiallyPaid = paid > 0 && outstanding > 0
                        
                        return (
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              isFullyPaid
                                ? 'bg-green-100 text-green-800'
                                : isPartiallyPaid
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : invoice.status === 'sent'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {isFullyPaid ? 'PAID' : isPartiallyPaid ? 'PARTIAL' : invoice.status.toUpperCase()}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                        <button
                          className="flex items-center justify-center text-xs font-medium px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewModal({ isOpen: true, invoice })
                          }}
                          title="Preview Invoice"
                        >
                          👁️
                        </button>
                        <Link
                          className="flex items-center justify-center text-xs font-medium px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                          to={`/invoices/${invoice.id}`}
                          title="Open Invoice"
                        >
                          Open
                        </Link>
                        {invoice.status !== 'paid' && (
                          <button
                            className="flex items-center justify-center text-xs font-medium px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              markInvoiceStatus(invoice.id, 'paid')
                              toast.success(`Invoice ${invoice.invoiceNo} marked as paid`)
                            }}
                            title="Mark as Paid"
                          >
                            Pay
                          </button>
                        )}
                        <PDFGenerator invoice={invoice} label="PDF" className="!px-2.5 !py-1 !text-xs !font-medium !bg-blue-600 !text-white !rounded-md hover:!bg-blue-700 !transition-colors !whitespace-nowrap !flex-shrink-0" />
                        <PrintInvoice invoice={invoice} label="🖨️" className="!px-2.5 !py-1 !text-xs !font-medium !bg-blue-600 !text-white !rounded-md hover:!bg-blue-700 !transition-colors !whitespace-nowrap !flex-shrink-0" />
                        <WhatsAppShare invoice={invoice} label="WhatsApp" className="!px-2.5 !py-1 !text-xs !font-medium !bg-green-600 !text-white !rounded-md hover:!bg-green-700 !transition-colors !whitespace-nowrap !flex-shrink-0" showHint={false} />
                        <button
                          className="flex items-center justify-center text-xs font-medium px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors whitespace-nowrap flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteModal({ isOpen: true, invoice })
                          }}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="glass-panel hidden md:block">
          <EmptyState
            icon={filtered.length === 0 && invoices.length > 0 ? icons.search : icons.invoice}
            title={filtered.length === 0 && invoices.length > 0 ? 'No matches found' : 'No invoices yet'}
            message={
              filtered.length === 0 && invoices.length > 0
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'Get started by creating your first invoice.'
            }
            actionLabel={filtered.length === 0 && invoices.length > 0 ? undefined : 'Create Invoice'}
            onAction={filtered.length === 0 && invoices.length > 0 ? undefined : () => navigate('/invoices/new')}
          />
        </div>
      )}

      {/* Mobile card view */}
      {paginated.length > 0 ? (
        <div className="md:hidden space-y-1.5">
          {paginated.map((invoice) => {
                  const total = invoice.totals?.grandTotal || 0
                  const paid = invoice.amountPaid || 0
                  const outstanding = Math.max(0, total - paid)
                  const isFullyPaid = outstanding === 0 && total > 0
                  const isPartiallyPaid = paid > 0 && outstanding > 0
                  
                  return (
              <div key={invoice.id} className="glass-panel p-2">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-2 pb-1.5 border-b border-gray-200">
                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                      className="rounded mt-0.5 flex-shrink-0 w-3.5 h-3.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Link to={`/invoices/${invoice.id}`} className="block font-semibold text-brand-primary hover:underline text-xs leading-tight">
                        {invoice.invoiceNo}
                      </Link>
                      <p className="text-[10px] text-gray-600 mt-0.5 leading-tight truncate">{invoice.customerName}</p>
                    </div>
                  </div>
                    <span
                    className={`inline-flex px-1.5 py-0.5 text-[9px] font-semibold rounded-full flex-shrink-0 ml-1.5 ${
                        isFullyPaid
                          ? 'bg-green-100 text-green-800'
                          : isPartiallyPaid
                            ? 'bg-yellow-100 text-yellow-800'
                            : invoice.status === 'sent'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {isFullyPaid ? 'PAID' : isPartiallyPaid ? 'PARTIAL' : invoice.status.toUpperCase()}
                    </span>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="space-y-0">
                    <span className="text-gray-500 text-[9px] block leading-tight">Date</span>
                    <p className="text-gray-900 font-medium text-[10px] leading-tight">{invoice.date}</p>
                  </div>
                  <div className="space-y-0">
                    <span className="text-gray-500 text-[9px] block leading-tight">Due</span>
                    <p className="text-gray-900 font-medium text-[10px] leading-tight">
                    {invoice.dueDate || '--'}
                    {invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' && (
                        <span className="ml-1 text-red-600 text-[9px] font-semibold">Overdue</span>
                    )}
                  </p>
                </div>
                  <div className="space-y-0">
                    <span className="text-gray-500 text-[9px] block leading-tight">Total</span>
                    <p className="text-gray-900 font-semibold text-xs leading-tight">{formatCurrency(total)}</p>
                </div>
                  <div className="space-y-0">
                    <span className="text-gray-500 text-[9px] block leading-tight">Outstanding</span>
                    <p className={`font-semibold text-xs leading-tight ${
                        outstanding === 0 
                          ? 'text-gray-400' 
                          : 'text-gray-900'
                      }`}>
                        {formatCurrency(outstanding)}
                      </p>
                  </div>
                </div>
                
                {/* Actions - Compact and Perfectly Arranged */}
                <div className="flex gap-1.5 pt-1.5 border-t border-gray-200 overflow-x-auto -mx-2 px-2">
                <Link
                    className="flex items-center justify-center text-xs font-medium px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                  to={`/invoices/${invoice.id}`}
                >
                    Open
                </Link>
                {invoice.status !== 'paid' && (
                  <button
                      className="flex items-center justify-center text-xs font-medium px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      markInvoiceStatus(invoice.id, 'paid')
                      toast.success(`Marked as paid`)
                    }}
                  >
                    Pay
                  </button>
                )}
                <PDFGenerator invoice={invoice} label="PDF" className="!px-2.5 !py-1 !text-xs !font-medium !bg-blue-600 !text-white !rounded-md hover:!bg-blue-700 !transition-colors !whitespace-nowrap !flex-shrink-0" />
                <PrintInvoice invoice={invoice} label="🖨️" className="!px-2.5 !py-1 !text-xs !font-medium !bg-blue-600 !text-white !rounded-md hover:!bg-blue-700 !transition-colors !whitespace-nowrap !flex-shrink-0" />
                <WhatsAppShare invoice={invoice} label="WhatsApp" className="!px-2.5 !py-1 !text-xs !font-medium !bg-green-600 !text-white !rounded-md hover:!bg-green-700 !transition-colors !whitespace-nowrap !flex-shrink-0" showHint={false} />
                <button
                    className="flex items-center justify-center text-xs font-medium px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors whitespace-nowrap flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteModal({ isOpen: true, invoice })
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-panel md:hidden">
          <EmptyState
            icon={filtered.length === 0 && invoices.length > 0 ? icons.search : icons.invoice}
            title={filtered.length === 0 && invoices.length > 0 ? 'No matches found' : 'No invoices yet'}
            message={
              filtered.length === 0 && invoices.length > 0
                ? 'Try adjusting your search or filters.'
                : 'Create your first invoice to get started.'
            }
            actionLabel={filtered.length === 0 && invoices.length > 0 ? undefined : 'Create Invoice'}
            onAction={filtered.length === 0 && invoices.length > 0 ? undefined : () => navigate('/invoices/new')}
          />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between glass-panel p-2.5 gap-3">
          <p className="text-xs text-gray-600 text-center sm:text-left leading-snug">
            Showing <span className="font-semibold">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of{' '}
            <span className="font-semibold">{filtered.length}</span> invoices
          </p>
          <div className="flex gap-1.5 w-full sm:w-auto">
            <button
              className="btn-secondary !py-1.5 flex-1 sm:flex-none min-w-[90px] text-xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <span className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-md flex items-center justify-center min-w-[70px]">
              {currentPage} / {totalPages}
            </span>
            <button
              className="btn-secondary !py-1.5 flex-1 sm:flex-none min-w-[90px] text-xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, invoice: null })}
        onConfirm={() => {
          if (selectedInvoices.length > 0) {
            handleBulkDelete()
          } else if (deleteModal.invoice) {
            handleDelete(deleteModal.invoice)
          }
        }}
        title="Delete Invoice?"
        message={
          selectedInvoices.length > 0
            ? `Are you sure you want to delete ${selectedInvoices.length} invoice(s)? This action cannot be undone.`
            : `Are you sure you want to delete invoice ${deleteModal.invoice?.invoiceNo}? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        invoice={previewModal.invoice}
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, invoice: null })}
      />
    </div>
  )
}

