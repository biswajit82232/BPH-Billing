import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../components/ToastContainer'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import PageHeader from '../components/PageHeader'
import EmptyState, { icons } from '../components/EmptyState'
import { formatCurrency } from '../lib/taxUtils'
import { calculateReceivablesByCustomer, calculateTotalReceivables } from '../utils/calculateReceivables'
import ConfirmModal from '../components/ConfirmModal'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

const emptyCustomer = { id: '', name: '', email: '', phone: '', state: '', gstin: '', address: '', aadhaar: '', dob: '', notes: '' }

export default function Customers() {
  const { customers, upsertCustomer, deleteCustomer, invoices, refreshData } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyCustomer)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [gstFilter, setGstFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingNotes, setEditingNotes] = useState(null)
  const [notesValue, setNotesValue] = useState('')
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, customer: null })
  
  const pullToRefresh = usePullToRefresh({ onRefresh: refreshData })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const query = debouncedSearch.toLowerCase()
      const matchesSearch =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.gstin?.toLowerCase().includes(query)
      
      const matchesGst = 
        gstFilter === 'all' ||
        (gstFilter === 'registered' && customer.gstin) ||
        (gstFilter === 'consumer' && !customer.gstin)
      
      const matchesState = !stateFilter || customer.state?.toLowerCase().includes(stateFilter.toLowerCase())
      
      return matchesSearch && matchesGst && matchesState
    })
  }, [customers, debouncedSearch, gstFilter, stateFilter])

  const hasActiveFilters = gstFilter !== 'all' || stateFilter

  // Validation
  const validateForm = () => {
    const newErrors = {}
    
    if (!form.name.trim()) {
      newErrors.name = 'Customer name is required'
    }
    
    if (!form.phone || form.phone.length !== 10) {
      newErrors.phone = 'Phone number must be 10 digits'
    }
    
    if (form.gstin && form.gstin.length !== 15) {
      newErrors.gstin = 'GSTIN must be 15 characters'
    }
    
    if (form.aadhaar && form.aadhaar.length !== 12) {
      newErrors.aadhaar = 'Aadhaar must be 12 digits'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors before saving')
      return
    }
    
    setSaving(true)
    try {
      const saved = await upsertCustomer(form)
      setForm(emptyCustomer)
      setErrors({})
      setShowForm(false)
      toast.success(`Customer "${saved.name}" saved successfully!`)
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error('Failed to save customer. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+s': (e) => {
      e.preventDefault()
      if (!saving && (showForm || form.id)) {
        handleSubmit(e)
      }
    },
    'escape': () => {
      if (showForm || form.id) {
        setShowForm(false)
        setForm(emptyCustomer)
        setErrors({})
      }
    },
  })

  // Calculate receivables per customer (recalculates when invoices change)
  const receivablesMap = useMemo(() => {
    const map = calculateReceivablesByCustomer(customers, invoices)
    return map
  }, [customers, invoices])

  // Calculate total receivables
  const totalReceivables = useMemo(() => {
    const total = calculateTotalReceivables(invoices)
    return total
  }, [invoices])

  // Calculate purchase history per customer (total of all invoices)
  const purchaseHistoryMap = useMemo(() => {
    const map = {}
    customers.forEach(customer => {
      const customerInvoices = invoices.filter(inv => 
        inv.customerId === customer.id && inv.status !== 'draft'
      )
      const total = customerInvoices.reduce((sum, inv) => {
        return sum + (inv.totals?.grandTotal || 0)
      }, 0)
      map[customer.id] = {
        total,
        count: customerInvoices.length
      }
    })
    return map
  }, [customers, invoices])

  const handleEditCustomer = (customer) => {
    setForm(customer)
    setShowForm(true)
    // Scroll to form
    setTimeout(() => {
      document.getElementById('customer-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }

  const handlePurchaseHistoryClick = (e, customer) => {
    e.stopPropagation() // Prevent row click
    if (purchaseHistoryMap[customer.id] && purchaseHistoryMap[customer.id].count > 0) {
      navigate(`/invoices?customerName=${encodeURIComponent(customer.name)}`)
    }
  }

  return (
    <div className="space-y-6 w-full relative">
      <PullToRefreshIndicator state={pullToRefresh} />
      <PageHeader
        title="Customers"
        subtitle={`${filteredCustomers.length} customers • ${formatCurrency(totalReceivables)} total receivables`}
        action={() => {
            setForm(emptyCustomer)
            setErrors({})
            setShowForm(true)
            setTimeout(() => {
              document.getElementById('customer-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }, 100)
          }}
        actionLabel="Add Customer"
        actionIcon={
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      />

      {/* Zoho-style Compact Search Bar */}
      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <div className="relative w-full max-w-xs sm:max-w-none sm:flex-1">
          <label htmlFor="customer-search" className="sr-only">Search customers</label>
          <input
            id="customer-search"
            className="w-full pr-7 sm:pr-9 md:pr-10 text-sm sm:text-base py-2 sm:py-2.5 pl-3 sm:pl-[2.25rem]"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search customers"
          />
          <svg className="hidden sm:block w-4 sm:h-4 md:w-5 md:h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 sm:right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border-2 transition-all flex items-center gap-1.5 sm:gap-2 ${
            hasActiveFilters
              ? 'bg-blue-50 border-brand-primary text-brand-primary'
              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {hasActiveFilters && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-primary rounded-full"></span>}
        </button>
      </div>

      {/* Collapsible Filters Panel */}
      {showFilters && (
        <section className="glass-panel p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GST Treatment</label>
              <select value={gstFilter} onChange={(e) => setGstFilter(e.target.value)} className="w-full">
                <option value="all">All</option>
                <option value="registered">Registered Business</option>
                <option value="consumer">Consumer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                placeholder="Filter by state"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setGstFilter('all')
                  setStateFilter('')
                  setSearch('')
                }}
                className="btn-secondary w-full"
              >
                Clear All
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Collapsible Customer Form */}
      {(showForm || form.id) && (
        <section id="customer-form" className="glass-panel p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">{form.id ? 'Edit Customer' : 'Add Customer'}</h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyCustomer)
                  setErrors({})
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500">Press Ctrl+S to save • Esc to clear</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label htmlFor="customer-name" className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
              <input
                id="customer-name"
                placeholder="Enter customer name"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                }}
                onBlur={() => {
                  if (!form.name.trim()) {
                    setErrors((prev) => ({ ...prev, name: 'Customer name is required' }))
                  } else {
                    setErrors((prev) => ({ ...prev, name: '' }))
                  }
                }}
                required
                aria-describedby={errors.name ? 'customer-name-error' : undefined}
                aria-invalid={!!errors.name}
                className={`w-full ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p id="customer-name-error" className="text-xs text-red-600 mt-1" role="alert" aria-live="polite">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={form.email}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="customer-phone" className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                id="customer-phone"
                type="tel"
                placeholder="10 digit phone"
                value={form.phone}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }))
                }}
                onBlur={() => {
                  if (!form.phone || form.phone.length !== 10) {
                    setErrors((prev) => ({ ...prev, phone: 'Phone number must be 10 digits' }))
                  } else {
                    setErrors((prev) => ({ ...prev, phone: '' }))
                  }
                }}
                required
                maxLength="10"
                aria-describedby={errors.phone ? 'customer-phone-error' : undefined}
                aria-invalid={!!errors.phone}
                className={`w-full ${errors.phone ? 'border-red-500' : ''}`}
              />
              {errors.phone && <p id="customer-phone-error" className="text-xs text-red-600 mt-1" role="alert" aria-live="polite">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input
                placeholder="Full address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <input
                placeholder="State name"
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                className="w-full"
              />
          </div>
          <div>
            <label htmlFor="customer-gstin" className="block text-xs font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
            <input
              id="customer-gstin"
              placeholder="15 character GSTIN"
              value={form.gstin}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) }))
                  if (errors.gstin) setErrors((prev) => ({ ...prev, gstin: '' }))
                }}
                onBlur={() => {
                  if (form.gstin && form.gstin.length !== 15) {
                    setErrors((prev) => ({ ...prev, gstin: 'GSTIN must be 15 characters' }))
                  } else {
                    setErrors((prev) => ({ ...prev, gstin: '' }))
                  }
                }}
              maxLength="15"
                aria-describedby={errors.gstin ? 'customer-gstin-error' : undefined}
                aria-invalid={!!errors.gstin}
                className={`w-full ${errors.gstin ? 'border-red-500' : ''}`}
              />
              {errors.gstin && <p id="customer-gstin-error" className="text-xs text-red-600 mt-1" role="alert" aria-live="polite">{errors.gstin}</p>}
            </div>
          </div>
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-gray-700 mb-2">Additional Details (Optional)</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
              className="w-full"
            />
          </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <input
                  id="customer-aadhaar"
                  type="text"
                  placeholder="12 digit Aadhaar"
                  value={form.aadhaar}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) }))
                    if (errors.aadhaar) setErrors((prev) => ({ ...prev, aadhaar: '' }))
                  }}
                  onBlur={() => {
                    if (form.aadhaar && form.aadhaar.length !== 12) {
                      setErrors((prev) => ({ ...prev, aadhaar: 'Aadhaar must be 12 digits' }))
                    } else {
                      setErrors((prev) => ({ ...prev, aadhaar: '' }))
                    }
                  }}
                  maxLength="12"
                  aria-describedby={errors.aadhaar ? 'customer-aadhaar-error' : undefined}
                  aria-invalid={!!errors.aadhaar}
                  className={`w-full ${errors.aadhaar ? 'border-red-500' : ''}`}
                />
                {errors.aadhaar && <p id="customer-aadhaar-error" className="text-xs text-red-600 mt-1" role="alert" aria-live="polite">{errors.aadhaar}</p>}
              </div>
            </div>
          </details>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sticky Notes</label>
            <textarea
              placeholder="Add notes about this customer..."
              value={form.notes || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full min-h-[80px]"
              rows="3"
            />
            <p className="text-xs text-gray-500 mt-1">Quick notes that will appear as sticky notes on the customer list</p>
          </div>
          <div className="flex gap-2 sm:gap-3 justify-end">
            <button type="submit" className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 flex-1 sm:flex-none" disabled={saving}>
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Saving</span>
                </>
              ) : (
                `${form.id ? 'Update' : 'Save'} Customer`
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(emptyCustomer)
                setErrors({})
              }}
              className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
      )}

      {/* Desktop table */}
      <section className="glass-panel overflow-x-auto hidden md:block">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <th className="min-w-[180px]">Customer Name</th>
                <th className="min-w-[180px]">Email</th>
                <th className="min-w-[120px]">Work Phone</th>
                <th className="min-w-[140px]">GST Treatment</th>
                <th className="text-right min-w-[120px]">Receivables</th>
                <th className="text-right min-w-[140px]">Purchase History</th>
                <th className="min-w-[200px]">Notes</th>
                <th className="min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const gstTreatment = customer.gstin ? 'Registered Business' : 'Consumer'
                const isEditingNotes = editingNotes === customer.id
                return (
                <tr
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (!e.target.closest('.notes-container') && !e.target.closest('.action-buttons')) {
                      handleEditCustomer(customer)
                    }
                  }}
                >
                    <td className="font-medium text-brand-primary hover:underline">{customer.name}</td>
                    <td className="text-gray-600">{customer.email || '--'}</td>
                  <td className="text-gray-600">{customer.phone || '--'}</td>
                    <td>
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        customer.gstin 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {gstTreatment}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-gray-900">{formatCurrency(receivablesMap[customer.id] || 0)}</td>
                    <td className="text-right">
                      {purchaseHistoryMap[customer.id] && purchaseHistoryMap[customer.id].count > 0 ? (
                        <div 
                          className="flex flex-col items-end cursor-pointer hover:text-brand-primary transition-colors"
                          onClick={(e) => handlePurchaseHistoryClick(e, customer)}
                          title="Click to view invoices"
                        >
                          <span className="font-semibold text-gray-900 hover:text-brand-primary">{formatCurrency(purchaseHistoryMap[customer.id].total)}</span>
                          <span className="text-xs text-gray-500 hover:text-brand-primary">{purchaseHistoryMap[customer.id].count} invoice{purchaseHistoryMap[customer.id].count !== 1 ? 's' : ''}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="notes-container py-2" onClick={(e) => e.stopPropagation()}>
                      {isEditingNotes ? (
                        <div className="relative">
                          <textarea
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            onBlur={async () => {
                              await upsertCustomer({ ...customer, notes: notesValue })
                              setEditingNotes(null)
                              toast.success('Notes saved')
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setEditingNotes(null)
                                setNotesValue('')
                              } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault()
                                upsertCustomer({ ...customer, notes: notesValue }).then(() => {
                                  setEditingNotes(null)
                                  toast.success('Notes saved')
                                })
                              }
                            }}
                            className="w-full min-w-[200px] max-w-[300px] p-2 text-xs border-2 border-yellow-400 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                            rows="3"
                            autoFocus
                            placeholder="Add notes..."
                          />
                          <p className="text-xs text-gray-500 mt-1">Ctrl+Enter to save, Esc to cancel</p>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNotes(customer.id)
                            setNotesValue(customer.notes || '')
                          }}
                          className={`min-w-[200px] max-w-[300px] p-2 text-xs rounded-md cursor-pointer transition-all hover:shadow-md ${
                            customer.notes
                              ? 'bg-yellow-100 border-2 border-yellow-300 shadow-sm'
                              : 'bg-gray-50 border-2 border-dashed border-gray-300 text-gray-400'
                          }`}
                          style={{
                            transform: customer.notes ? 'rotate(-1deg)' : 'none',
                            boxShadow: customer.notes ? '2px 2px 4px rgba(0,0,0,0.1)' : 'none',
                          }}
                        >
                          {customer.notes ? (
                            <p className="text-gray-800 whitespace-pre-wrap break-words">{customer.notes}</p>
                          ) : (
                            <p className="text-center">📝 Click to add notes...</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="action-buttons py-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, customer })}
                        className="btn-danger !py-1.5 !text-xs"
                      >
                        Delete
                      </button>
                    </td>
                </tr>
                )
              })}
              {!filteredCustomers.length && customers.length > 0 && (
                <tr>
                  <td colSpan="8" className="p-0">
                    <EmptyState
                      icon={icons.search}
                      title="No matches found"
                      message="Try adjusting your search or filters to find what you're looking for."
                    />
                  </td>
                </tr>
              )}
              {!customers.length && (
                <tr>
                  <td colSpan="8" className="p-0">
                    <EmptyState
                      icon={icons.customer}
                      title="No customers yet"
                      message="Add your first customer using the form above to get started."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mobile cards */}
      <div className="md:hidden space-y-1.5">
        {filteredCustomers.map((customer) => {
          const gstTreatment = customer.gstin ? 'Registered Business' : 'Consumer'
          const isEditingNotes = editingNotes === customer.id
          return (
          <div
            key={customer.id}
              className="glass-panel p-2 overflow-visible"
          >
              {/* Header Section */}
              <div 
                className="cursor-pointer mb-2 pb-1.5 border-b border-gray-200"
            onClick={() => handleEditCustomer(customer)}
          >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-primary text-xs leading-tight truncate">{customer.name}</p>
                  {customer.email && <p className="text-[10px] text-gray-600 mt-0.5 leading-tight truncate">{customer.email}</p>}
                </div>
                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-medium rounded-full flex-shrink-0 ml-1.5 ${
                  customer.gstin 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {gstTreatment}
                </span>
              </div>
              
              {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0">
                <span className="text-gray-500 text-[9px] block leading-tight">Phone</span>
                <span className="text-gray-900 text-[10px] font-medium block leading-tight">{customer.phone || '--'}</span>
              </div>
              <div className="space-y-0">
                <span className="text-gray-500 text-[9px] block leading-tight">State</span>
                <span className="text-gray-900 text-[10px] font-medium block leading-tight truncate">{customer.state || '--'}</span>
              </div>
                {customer.gstin && (
                  <div className="col-span-2 space-y-0">
                    <span className="text-gray-500 text-[9px] block leading-tight">GSTIN</span>
                    <span className="text-gray-900 font-mono text-[10px] block leading-tight break-all">{customer.gstin}</span>
              </div>
                )}
              <div className="space-y-0">
                  <span className="text-gray-500 text-[9px] block leading-tight">Receivables</span>
                  <span className="font-semibold text-gray-900 text-xs block leading-tight">{formatCurrency(receivablesMap[customer.id] || 0)}</span>
              </div>
              <div className="space-y-0">
                  <span className="text-gray-500 text-[9px] block leading-tight">Purchase History</span>
                  {purchaseHistoryMap[customer.id] && purchaseHistoryMap[customer.id].count > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePurchaseHistoryClick(e, customer)
                      }}
                      className="font-semibold text-brand-primary hover:underline text-[10px] text-left leading-tight"
                    >
                      {formatCurrency(purchaseHistoryMap[customer.id].total)} ({purchaseHistoryMap[customer.id].count})
                    </button>
                  ) : (
                    <span className="font-semibold text-gray-400 text-[10px] block leading-tight">--</span>
                  )}
              </div>
              </div>
              </div>
              {/* Sticky Notes and Delete Button for Mobile */}
              <div 
                className="mt-1.5 pt-1 border-t border-gray-200 flex gap-1 items-center justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-1 items-center flex-1 min-w-0 overflow-hidden">
                  {isEditingNotes ? (
                    <div className="flex-1 min-w-0">
                      <textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        onBlur={async () => {
                          await upsertCustomer({ ...customer, notes: notesValue })
                          setEditingNotes(null)
                          toast.success('Notes saved')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingNotes(null)
                            setNotesValue('')
                          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            upsertCustomer({ ...customer, notes: notesValue }).then(() => {
                              setEditingNotes(null)
                              toast.success('Notes saved')
                            })
                          }
                        }}
                        className="w-full p-0.5 text-[9px] border border-yellow-400 rounded bg-yellow-50 focus:outline-none focus:ring-1 focus:ring-yellow-400 resize-none"
                        rows="1"
                        autoFocus
                        placeholder="Add notes..."
                      />
                      <p className="text-[8px] text-gray-500 mt-0.5">Ctrl+Enter to save, Esc to cancel</p>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingNotes(customer.id)
                          setNotesValue(customer.notes || '')
                        }}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                        title={customer.notes ? 'Edit notes' : 'Add notes'}
                      >
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {customer.notes && (
                        <div className="px-1 py-0.5 text-[8px] bg-yellow-100 border border-yellow-300 rounded max-w-[60px] overflow-hidden">
                          <p className="text-gray-800 truncate leading-tight">{customer.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteModal({ isOpen: true, customer })
                  }}
                  className="btn-danger !py-1 !px-2.5 !text-xs flex-shrink-0 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {!filteredCustomers.length && customers.length > 0 && (
          <div className="glass-panel">
            <EmptyState
              icon={icons.search}
              title="No matches found"
              message="Try adjusting your search or filters."
            />
          </div>
        )}
        {!customers.length && (
          <div className="glass-panel">
            <EmptyState
              icon={icons.customer}
              title="No customers yet"
              message="Add your first customer using the form above to get started."
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Customer?"
        message={
          deleteModal.customer
            ? `Are you sure you want to delete "${deleteModal.customer.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this customer?'
        }
        confirmText="Delete"
        onClose={() => setDeleteModal({ isOpen: false, customer: null })}
        onConfirm={async () => {
          if (!deleteModal.customer) return
          try {
            await deleteCustomer(deleteModal.customer.id)
            toast.success('Customer deleted')
          } catch (error) {
            console.error('Error deleting customer:', error)
            toast.error('Failed to delete customer. Please try again.')
          } finally {
            setDeleteModal({ isOpen: false, customer: null })
          }
        }}
      />
    </div>
  )
}

