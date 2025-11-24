import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../components/ToastContainer'
import PDFGenerator from '../components/PDFGenerator'
import WhatsAppShare from '../components/WhatsAppShare'
import PrintInvoice from '../components/PrintInvoice'
import InvoicePreview from '../components/InvoicePreview'
import PageHeader from '../components/PageHeader'
import SignaturePad from '../components/SignaturePad'
import { calculateInvoiceTotals, formatCurrency, makeInvoiceNo } from '../lib/taxUtils'
import { safeReload } from '../utils/reloadGuard'

const blankItem = {
  productName: '',
  description: '',
  hsn: '',
  qty: 1,
  rate: 0,
  taxPercent: 18,
}

export default function CreateInvoice() {
  const { customers, products, settings, saveInvoice, invoices, upsertCustomer, updateSettings, meta } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const { invoiceId } = useParams()
  const editingInvoice = invoiceId ? invoices.find((inv) => inv.id === invoiceId) : null
  const [customerId, setCustomerId] = useState('')
  const [customCustomer, setCustomCustomer] = useState({ name: '', email: '', phone: '', state: settings.companyState, gstin: '', address: '', aadhaar: '', dob: '' })
  const [items, setItems] = useState([blankItem])
  const [notes, setNotes] = useState('Thanks for your business.')
  const [reverseCharge, setReverseCharge] = useState(false)
  const [customerSignature, setCustomerSignature] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [terms, setTerms] = useState('Due on Receipt')
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amountPaid, setAmountPaid] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [productSuggestions, setProductSuggestions] = useState([])
  const [activeItemIndex, setActiveItemIndex] = useState(null)
  const [customerPhoneOverride, setCustomerPhoneOverride] = useState('')
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [invoiceNoManual, setInvoiceNoManual] = useState('')
  const [invoiceNoEdited, setInvoiceNoEdited] = useState(false)
  const selectedCustomer = customerId ? customers.find((c) => c.id === customerId) : null
  const autoInvoiceNo = useMemo(
    () => makeInvoiceNo((meta?.invoiceSequence || 0) + 1, date, settings.invoicePrefix || 'BPH'),
    [meta?.invoiceSequence, date, settings.invoicePrefix],
  )
  const invoiceNumberDisplay = invoiceNoEdited ? (invoiceNoManual || '') : autoInvoiceNo
  const manualInvoiceNoClean = invoiceNoEdited ? (invoiceNoManual || '').trim() : ''
  const invoiceNoConflict = useMemo(() => {
    if (!invoiceNoEdited || !manualInvoiceNoClean) return false
    return invoices.some(
      (inv) => inv.invoiceNo?.toLowerCase() === manualInvoiceNoClean.toLowerCase() && inv.id !== editingInvoice?.id,
    )
  }, [invoiceNoEdited, manualInvoiceNoClean, invoices, editingInvoice])
  
  // Pull to refresh state
  const [pullToRefresh, setPullToRefresh] = useState({ 
    isPulling: false, 
    startY: 0, 
    distance: 0, 
    isRefreshing: false 
  })
  const pullStartRef = useRef(null)

  // Toggle tax on/off
  const toggleTax = useCallback(() => {
    setTaxEnabled((prev) => {
      const newTaxEnabled = !prev
      if (newTaxEnabled) {
        // Tax ON: restore original tax percentages or set to default 18%
        setItems((prevItems) =>
          prevItems.map((item) => ({
            ...item,
            taxPercent: item.taxPercent === 0 ? 18 : item.taxPercent || 18,
          }))
        )
      } else {
        // Tax OFF: set all tax percentages to 0
        setItems((prevItems) =>
          prevItems.map((item) => ({
            ...item,
            taxPercent: 0,
          }))
        )
      }
      return newTaxEnabled
    })
  }, [])
  useEffect(() => {
    if (selectedCustomer) {
      setCustomerPhoneOverride(selectedCustomer.phone || '')
    } else {
      setCustomerPhoneOverride('')
    }
  }, [selectedCustomer])

  // Update customerId when customers list changes (e.g., after adding a new customer)
  // Calculate due date based on terms (only when date or terms change, not when dueDate changes)
  const isManualDueDateEdit = useRef(false)
  
  useEffect(() => {
    // Skip auto-calculation if user manually edited due date
    if (isManualDueDateEdit.current) {
      isManualDueDateEdit.current = false
      return
    }
    
    const invoiceDate = new Date(date)
    let daysToAdd = 0
    
    switch (terms) {
      case 'Net 15':
        daysToAdd = 15
        break
      case 'Net 30':
        daysToAdd = 30
        break
      case 'Net 45':
        daysToAdd = 45
        break
      case 'Net 60':
        daysToAdd = 60
        break
      case 'Due on Receipt':
      default:
        daysToAdd = 0
        break
    }
    
    const calculatedDueDate = new Date(invoiceDate)
    calculatedDueDate.setDate(calculatedDueDate.getDate() + daysToAdd)
    const newDueDate = format(calculatedDueDate, 'yyyy-MM-dd')
    if (newDueDate !== dueDate) {
      setDueDate(newDueDate)
    }
  }, [date, terms]) // Removed dueDate from dependencies to prevent overwriting manual edits

  useEffect(() => {
    if (!editingInvoice) {
      // Reset form for new invoice - using setTimeout to avoid setState in effect warning
      setTimeout(() => {
        setCustomerId('')
        setCustomCustomer({ name: '', email: '', phone: '', state: settings.companyState, gstin: '', address: '', aadhaar: '', dob: '' })
        setItems([blankItem])
        setNotes('Thanks for your business.')
        setReverseCharge(false)
        setDate(format(new Date(), 'yyyy-MM-dd'))
        setTerms('Due on Receipt')
        setDueDate(format(new Date(), 'yyyy-MM-dd'))
        setDiscountAmount(0)
        setAmountPaid(0)
        setPaymentMethods([])
      }, 0)
      return
    }
    
    // Load existing invoice data
    const customer = editingInvoice.customerId
      ? customers.find((c) => c.id === editingInvoice.customerId)
      : null
      
    if (customer) {
      setCustomerId(customer.id)
      setCustomCustomer({ name: '', email: '', phone: '', state: settings.companyState, gstin: '', address: '', aadhaar: '', dob: '' })
    } else {
      setCustomerId('')
      // Load all customer fields from invoice
      setCustomCustomer({
        name: editingInvoice.customerName || '',
        email: editingInvoice.email || '',
        phone: editingInvoice.phone || '',
        state: editingInvoice.state || editingInvoice.place_of_supply || settings.companyState,
        gstin: editingInvoice.gstin || '',
        address: editingInvoice.address || '',
        aadhaar: editingInvoice.aadhaar || '',
        dob: editingInvoice.dob || '',
      })
    }
    setItems(editingInvoice.items || [blankItem])
    setNotes(editingInvoice.notes || 'Thanks for your business.')
    setReverseCharge(Boolean(editingInvoice.reverseCharge))
    setCustomerSignature(editingInvoice.customerSignature || '')
    setDate(editingInvoice.date || format(new Date(), 'yyyy-MM-dd'))
    setTerms(editingInvoice.terms || 'Due on Receipt')
    // Preserve existing due date when editing, don't auto-recalculate
    if (editingInvoice.dueDate) {
      isManualDueDateEdit.current = true
      setDueDate(editingInvoice.dueDate)
    } else {
      setDueDate(format(new Date(), 'yyyy-MM-dd'))
    }
    setAmountPaid(editingInvoice.amountPaid || 0)
    // Load payment methods from invoice, or create from amountPaid for backward compatibility
    if (editingInvoice.paymentMethods && Array.isArray(editingInvoice.paymentMethods) && editingInvoice.paymentMethods.length > 0) {
      setPaymentMethods(editingInvoice.paymentMethods)
    } else if (editingInvoice.amountPaid > 0) {
      // Backward compatibility: create a single payment method entry
      setPaymentMethods([{ method: 'Cash', amount: editingInvoice.amountPaid, reference: '' }])
    } else {
      setPaymentMethods([])
    }
    // Load discount from invoice, with fallback to totals.discount for backward compatibility
    const loadedDiscount = editingInvoice.discountAmount ?? editingInvoice.totals?.discount ?? 0
    setDiscountAmount(Number(loadedDiscount) || 0)
    // Set tax enabled based on whether any items have tax
    const hasTax = editingInvoice.items?.some(item => item.taxPercent > 0) ?? true
    setTaxEnabled(hasTax)
  }, [editingInvoice, customers, settings.companyState])

  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNoManual(editingInvoice.invoiceNo || '')
      setInvoiceNoEdited(true)
    } else {
      setInvoiceNoManual('')
      setInvoiceNoEdited(false)
    }
  }, [editingInvoice])

  const derived = useMemo(
    () =>
      calculateInvoiceTotals(
        items,
        selectedCustomer?.state || customCustomer.state || settings.companyState,
        settings.companyState,
      ),
    [items, selectedCustomer, customCustomer, settings],
  )

  // Only clamp discount if it exceeds grand total, but preserve it otherwise
  useEffect(() => {
      const baseTotal = derived.totals.grandTotal
    setDiscountAmount((prev) => {
      // Only update if discount exceeds the new grand total
      // This prevents resetting valid discounts when totals change
      if (prev > baseTotal && baseTotal > 0) {
        return baseTotal
      }
      // Preserve the discount value if it's valid
      return prev
    })
  }, [derived.totals.grandTotal])

  const discountValue = useMemo(() => {
    const raw = Number(discountAmount) || 0
    const clamped = Math.max(0, Math.min(raw, derived.totals.grandTotal))
    return +clamped.toFixed(2)
  }, [discountAmount, derived.totals.grandTotal])

  const totalsWithDiscount = useMemo(() => {
    const netGrand = Math.max(0, derived.totals.grandTotal - discountValue)
    return {
      ...derived.totals,
      discount: discountValue,
      grandTotal: +netGrand.toFixed(2),
    }
  }, [derived.totals, discountValue])

  // Sync amountPaid with paymentMethods total
  useEffect(() => {
    const totalFromMethods = paymentMethods.reduce((sum, pm) => sum + (Number(pm.amount) || 0), 0)
    setAmountPaid(totalFromMethods)
  }, [paymentMethods])

  const invoicePreview = useMemo(
    () => ({
      id: editingInvoice?.id || 'preview',
      invoiceNo: invoiceNumberDisplay || 'Preview',
      date,
      terms: terms,
      dueDate: dueDate,
      customerName: selectedCustomer?.name || customCustomer.name || 'Walk-in Customer',
      email: selectedCustomer?.email || customCustomer.email || '',
      phone: selectedCustomer?.phone || customCustomer.phone || '',
      address: selectedCustomer?.address || customCustomer.address || '',
      dob: selectedCustomer?.dob || customCustomer.dob || '',
      aadhaar: selectedCustomer?.aadhaar || customCustomer.aadhaar || '',
      place_of_supply: selectedCustomer?.state || customCustomer.state || settings.companyState,
      gstin: selectedCustomer?.gstin || customCustomer.gstin || '',
      companyGstin: settings.companyGstin || '',
      items: derived.rows,
      discountAmount: discountValue,
      totals: totalsWithDiscount,
      notes: notes,
      reverseCharge: reverseCharge,
      amountPaid: Number(amountPaid) || 0,
      paymentMethods: paymentMethods,
      customerSignature: customerSignature,
    }),
    [invoiceNumberDisplay, date, terms, dueDate, selectedCustomer, customCustomer, settings.companyState, derived.rows, totalsWithDiscount, discountValue, notes, reverseCharge, amountPaid, paymentMethods, customerSignature],
  )

  const updateItem = useCallback((index, field, value) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)))
  }, [])

  const addItem = useCallback(() => setItems((prev) => [...prev, blankItem]), [])
  const removeItem = useCallback((index) => setItems((prev) => prev.filter((_, idx) => idx !== index)), [])

  const addProductToItems = (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    setItems((prev) => [
      ...prev,
      {
        productName: product.name,
        description: product.name,
        hsn: product.hsn,
        qty: 1,
        rate: product.unit_price,
        taxPercent: product.tax_percent,
        productId: product.id,
      },
    ])
  }

  const handleSave = async (status) => {
    // Validation
    const customerName = selectedCustomer?.name || customCustomer.name
    const phoneInput = selectedCustomer ? customerPhoneOverride : customCustomer.phone
    if (!phoneInput || phoneInput.trim().length !== 10) {
      toast.error('Valid 10-digit phone number is required')
      return
    }
    const customerPhone = phoneInput.trim()
    
    if (!customerName || !customerName.trim()) {
      toast.error('Customer name is required')
      return
    }
    
    if (!customerPhone || customerPhone.length !== 10) {
      toast.error('Valid 10-digit phone number is required')
      return
    }
    
    const hasValidItems = items.some(item => 
      (item.productName || item.description) && 
      item.qty > 0 && 
      item.rate > 0
    )
    
    if (!hasValidItems) {
      toast.error('Add at least one item with quantity and price')
      return
    }
    
    // Ensure customer data is properly structured
    let customerData = null
    if (selectedCustomer) {
      if (customerPhone !== (selectedCustomer.phone || '')) {
        const updatedCustomer = await upsertCustomer({
          ...selectedCustomer,
          phone: customerPhone,
        })
        customerData = updatedCustomer
      } else {
        customerData = selectedCustomer
      }
    } else if (customCustomer.name && customCustomer.phone) {
      // Check if this walk-in customer already exists (by phone)
      const existingCustomer = customers.find(c => c.phone === customCustomer.phone)
      
      if (existingCustomer) {
        // Use existing customer
        customerData = existingCustomer
      } else {
        // Auto-save new walk-in customer to customer master
        const newCustomer = await upsertCustomer({
        name: customCustomer.name,
        email: customCustomer.email || '',
        phone: customCustomer.phone,
        state: customCustomer.state,
        gstin: customCustomer.gstin || '',
        address: customCustomer.address || '',
        aadhaar: customCustomer.aadhaar || '',
        dob: customCustomer.dob || '',
          totalPurchase: 0,
        })
        customerData = newCustomer
        toast.success(`✓ Customer "${newCustomer.name}" auto-saved to Customers list`)
      }
    }

    const grandTotal = totalsWithDiscount.grandTotal || 0
    const finalAmountPaid = Number(amountPaid) || 0
    
    // Auto-mark as paid if amount paid >= total
    let finalStatus = status
    if (finalAmountPaid >= grandTotal && grandTotal > 0) {
      finalStatus = 'paid'
    } else if (finalStatus === 'paid' && finalAmountPaid < grandTotal) {
      // If manually marked as paid but amount paid is less, keep as sent
      finalStatus = 'sent'
    }

    if (!customerData) {
      toast.error('Customer information is incomplete')
      return
    }

    if (invoiceNoEdited) {
      if (!manualInvoiceNoClean) {
        toast.error('Invoice number cannot be empty')
        return
      }
      if (invoiceNoConflict) {
        toast.error('Invoice number already exists. Please choose a different value.')
        return
      }
    }

    const payload = {
      id: editingInvoice?.id,
      invoiceNo: invoiceNoEdited ? manualInvoiceNoClean : undefined,
      date,
      terms,
      dueDate,
      customer: customerData,
      items,
      notes,
      reverseCharge,
      discountAmount: discountValue,
      amountPaid: finalAmountPaid,
      paymentMethods: paymentMethods,
      customerSignature: customerSignature,
      version: editingInvoice?.version, // Include version for optimistic locking
    }
    
    try {
      const savedInvoice = await saveInvoice(payload, finalStatus)
      const statusText = finalStatus === 'draft' ? 'saved as draft' : finalStatus === 'paid' ? 'saved and marked paid' : 'saved and marked sent'
      toast.success(`Invoice ${statusText}${customerData.id ? ` • Linked to ${customerData.name}` : ''}`)
      // Wait for React state updates to propagate and ensure new invoice appears in list
      // Use multiple frames to ensure all state updates complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          navigate('/invoices', { replace: false })
        })
      })
    } catch (error) {
      console.error('Error saving invoice:', error)
      if (error.message && error.message.includes('CONFLICT')) {
        toast.error('Invoice was modified by another user. Refreshing...', { duration: 5000 })
        // Refresh page to get latest version
        safeReload(2000)
      } else {
      toast.error('Failed to save invoice. Please try again.')
      }
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full md:max-w-7xl mx-auto relative">
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <PageHeader
          title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
          subtitle={editingInvoice ? `Editing ${editingInvoice.invoiceNo}` : 'Create a new invoice for your customer'}
        />
        <div className="flex flex-row justify-end gap-1.5 sm:gap-2">
          <button className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => handleSave('draft')}>
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Draft</span>
          </button>
          <button className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => handleSave('sent')}>
            <span className="hidden sm:inline">Save & Mark Sent</span>
            <span className="sm:hidden">Sent</span>
          </button>
          <button className="btn-success text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => handleSave('paid')}>
            <span className="hidden sm:inline">Save & Mark Paid</span>
            <span className="sm:hidden">Paid</span>
          </button>
        </div>
      </div>

      <section className="glass-panel p-4 md:p-6 w-full">
        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Invoice Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 w-full">
          {/* Left Column */}
          <div className="space-y-4">
          <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name *</label>
            <div className="relative">
              <input
                type="text"
                className="w-full pr-10"
                placeholder="Search or select customer..."
                value={customerSearch || (selectedCustomer ? selectedCustomer.name : customCustomer.name)}
              onChange={(e) => {
                  const value = e.target.value
                  setCustomerSearch(value)
                  setCustomerId('')
                  setCustomCustomer((prev) => ({ ...prev, name: value }))
                  
                  if (value.length >= 1) {
                    const matches = customers.filter(c => 
                      c.name.toLowerCase().includes(value.toLowerCase()) ||
                      c.phone?.includes(value)
                    ).slice(0, 8)
                    setCustomerSuggestions(matches)
                    setShowCustomerSuggestions(true)
                  } else {
                    setShowCustomerSuggestions(false)
                  }
                }}
                onFocus={() => {
                  if (!selectedCustomer && customers.length > 0) {
                    setCustomerSuggestions(customers.slice(0, 8))
                    setShowCustomerSuggestions(true)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (!document.activeElement?.closest('.customer-suggestion-dropdown')) {
                      setShowCustomerSuggestions(false)
                    }
                  }, 250)
                }}
              />
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerId('')
                    setCustomerSearch('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear selection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {showCustomerSuggestions && customerSuggestions.length > 0 && (
              <div 
                className="customer-suggestion-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
              >
                {customerSuggestions.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setCustomerId(customer.id)
                      setCustomerSearch('')
                      setCustomCustomer({ name: '', email: '', phone: '', state: settings.companyState, gstin: '', address: '', aadhaar: '', dob: '' })
                      setShowCustomerSuggestions(false)
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {customer.phone || 'No phone'} • {customer.state || 'No state'}
                      {customer.gstin && ' • GST'}
                    </p>
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Invoice Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invoiceNumberDisplay}
                  onChange={(e) => {
                    setInvoiceNoEdited(true)
                    setInvoiceNoManual(e.target.value.toUpperCase())
                  }}
                  className="w-full"
                  placeholder="Auto generated"
                />
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceNoEdited(false)
                    setInvoiceNoManual('')
                  }}
                  disabled={!invoiceNoEdited}
                  className="px-3 py-2 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Revert to auto-generated number"
                >
                  Auto
                </button>
              </div>
              <p className={`text-xs mt-1 ${invoiceNoConflict ? 'text-red-600' : 'text-gray-500'}`}>
                {invoiceNoConflict
                  ? 'Invoice number already exists. Choose a different value.'
                  : 'Generated from company prefix and date. You can override it manually.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Invoice Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Terms</label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full"
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  isManualDueDateEdit.current = true
                  setDueDate(e.target.value)
                }}
                className="w-full bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from terms</p>
            </div>
          </div>
        </div>

        {!selectedCustomer && (
          <div className="mt-4 sm:mt-5 space-y-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Additional Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label htmlFor="invoice-phone" className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  id="invoice-phone"
                  type="tel"
                  placeholder="10 digit phone"
                  value={customCustomer.phone}
                  onChange={(e) => setCustomCustomer((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  onBlur={() => {
                    const phoneInput = selectedCustomer ? customerPhoneOverride : customCustomer.phone
                    if (!phoneInput || phoneInput.trim().length !== 10) {
                      // Validation will be shown on save, but we can add visual feedback here
                    }
                  }}
                  aria-describedby="invoice-phone-hint"
                  aria-required="true"
                  required
                  maxLength="10"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={customCustomer.dob}
                  onChange={(e) => setCustomCustomer((prev) => ({ ...prev, dob: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="12 digit Aadhaar"
                  value={customCustomer.aadhaar}
                  onChange={(e) => setCustomCustomer((prev) => ({ ...prev, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                  maxLength="12"
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <input
                  placeholder="Full address"
                  value={customCustomer.address}
                  onChange={(e) => setCustomCustomer((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                <input
                  placeholder="State name"
                  value={customCustomer.state}
                  onChange={(e) => setCustomCustomer((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
              <input
                placeholder="15 character GSTIN"
                value={customCustomer.gstin}
                onChange={(e) => setCustomCustomer((prev) => ({ ...prev, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) }))}
                maxLength="15"
                className="w-full"
              />
            </div>
          </div>
        )}
        
        {selectedCustomer && (
          <div className="mt-4 sm:mt-5 p-3 md:p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Selected Customer Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs mb-1">Name</span>
                <span className="font-medium text-gray-900">{selectedCustomer.name}</span>
              </div>
              <div>
                <label htmlFor="customer-phone-override" className="text-gray-500 block text-xs mb-1">Phone *</label>
                <input
                  id="customer-phone-override"
                  type="tel"
                  value={customerPhoneOverride}
                  onChange={(e) =>
                    setCustomerPhoneOverride(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  onBlur={() => {
                    if (customerPhoneOverride && customerPhoneOverride.length !== 10) {
                      // Visual feedback will be shown on save
                    }
                  }}
                  className="w-full text-sm"
                  placeholder="10 digit phone"
                  maxLength="10"
                  aria-describedby="customer-phone-override-hint"
                  aria-required="true"
                />
                <p id="customer-phone-override-hint" className="text-xs text-gray-500 mt-1">Used on invoice, PDF & WhatsApp</p>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-1">Date of Birth</span>
                <span className="text-gray-900">{selectedCustomer.dob || '--'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-1">Aadhaar Number</span>
                <span className="text-gray-900">{selectedCustomer.aadhaar || '--'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500 block text-xs mb-1">Address</span>
                <span className="text-gray-900">{selectedCustomer.address || '--'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-1">State</span>
                <span className="text-gray-900">{selectedCustomer.state || '--'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-1">GSTIN</span>
                <span className="text-gray-900">{selectedCustomer.gstin || '--'}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="glass-panel p-4 md:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 pb-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Item Table</h3>
          <button
            type="button"
            onClick={toggleTax}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              taxEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${taxEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            Tax {taxEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="space-y-4 sm:space-y-5">
          {items.map((item, idx) => {
            const selectedProduct = item.productId ? products.find((p) => p.id === item.productId) : null
            return (
              <div key={idx} className="grid md:grid-cols-7 gap-3 text-sm items-end">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
                  {selectedProduct ? (
                    <div className="w-full px-4 py-3 rounded-lg text-sm font-medium border-2 bg-blue-50 border-blue-200 text-blue-900 flex justify-between items-center">
                      <span>{selectedProduct.name}</span>
                      <button
                        type="button"
                        onClick={() => updateItem(idx, 'productId', null)}
                        className="text-blue-700 hover:text-blue-900 ml-2"
                        title="Clear selection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                  </div>
                  ) : (
                    <>
                    <input
                      className="w-full"
                        placeholder="Search or enter product"
                      value={item.productName || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          updateItem(idx, 'productName', value)
                          
                          if (value.length >= 1) {
                            const matches = products.filter(p => 
                              p.name.toLowerCase().includes(value.toLowerCase()) ||
                              p.sku?.toLowerCase().includes(value.toLowerCase())
                            ).slice(0, 6)
                            setProductSuggestions(matches)
                            setActiveItemIndex(idx)
                            setShowProductSuggestions(true)
                          } else {
                            setShowProductSuggestions(false)
                            setActiveItemIndex(null)
                          }
                        }}
                        onFocus={() => {
                          setActiveItemIndex(idx)
                          if (item.productName && item.productName.length >= 1) {
                            const matches = products.filter(p => 
                              p.name.toLowerCase().includes(item.productName.toLowerCase())
                            ).slice(0, 6)
                            if (matches.length > 0) {
                              setProductSuggestions(matches)
                              setShowProductSuggestions(true)
                            }
                          } else {
                            // Show all products when focusing empty field
                            setProductSuggestions(products.slice(0, 6))
                            setShowProductSuggestions(true)
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding suggestions to allow click to register
                          setTimeout(() => {
                            // Only hide if not clicking on a suggestion
                            if (!document.activeElement?.closest('.product-suggestion-dropdown')) {
                              setShowProductSuggestions(false)
                              setActiveItemIndex(null)
                            }
                          }, 250)
                        }}
                      />
                      {showProductSuggestions && activeItemIndex === idx && productSuggestions.length > 0 && (
                        <div 
                          className="product-suggestion-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                          onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
                        >
                          {productSuggestions.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setItems((prev) => prev.map((itm, i) => 
                                  i === idx ? {
                                    ...itm, // Preserve existing fields like qty
                                    productId: product.id,
                                    productName: product.name,
                                    description: product.name,
                                    hsn: product.hsn,
                                    qty: itm.qty || 1, // Keep existing qty if set
                                    rate: product.unit_price,
                                    taxPercent: product.tax_percent,
                                  } : itm
                                ))
                                setShowProductSuggestions(false)
                                setActiveItemIndex(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-medium text-gray-900">{product.name}</p>
                                  <p className="text-xs text-gray-500">₹{product.unit_price} • {product.tax_percent}% GST</p>
                                </div>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  product.stock === 0 ? 'bg-red-100 text-red-700' :
                                  product.stock < 10 ? 'bg-orange-100 text-orange-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {product.stock}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description / Battery Serials</label>
                  <textarea
                    className="w-full"
                    rows="2"
                    placeholder="Enter serials separated by commas or new lines"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  />
                </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">HSN</label>
                <input
                  className="w-full"
                  value={item.hsn}
                  onChange={(e) => updateItem(idx, 'hsn', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  className="w-full"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rate</label>
                <input
                  type="number"
                  className="w-full"
                  value={item.rate}
                  onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
                <input
                  type="number"
                  className="w-full"
                  value={item.taxPercent}
                  onChange={(e) => updateItem(idx, 'taxPercent', Number(e.target.value))}
                />
              </div>
              <button
                type="button"
                className="text-rose-500 text-xs"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
              >
                Remove
              </button>
            </div>
            )
          })}
        </div>
        <button type="button" className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={addItem}>
          + Add Row
        </button>
      </section>

      <section className="glass-panel p-4 md:p-6 grid md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Notes</label>
          <textarea
            className="w-full"
            rows="5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thanks for your business."
          />
          <p className="text-xs text-gray-500 mt-2">Will be displayed on the invoice</p>
          <label className="flex items-center gap-2 text-sm mt-4 text-gray-700">
            <input
              type="checkbox"
              checked={reverseCharge}
              onChange={(e) => setReverseCharge(e.target.checked)}
              className="rounded"
            />
            Reverse Charge Applicable
          </label>
        </div>
        
        {/* Signature Section */}
        <div className="glass-panel p-4 md:p-6 space-y-4 overflow-visible">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Signatures</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
            <div className="space-y-2 w-full">
              <SignaturePad
                label="Customer Signature"
                value={customerSignature}
                onChange={setCustomerSignature}
                width={300}
                height={150}
                showClearButton={false}
              />
            </div>
            <div className="space-y-2 w-full">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Company Signature</label>
                {settings.companySignature && (
                  <button
                    type="button"
                    onClick={async () => {
                      await updateSettings({ companySignature: '' })
                      toast.success('Company signature cleared')
                    }}
                    className="text-xs text-red-600 hover:text-red-700 whitespace-nowrap ml-2"
                  >
                    Clear
                  </button>
                )}
              </div>
              <SignaturePad
                label=""
                value={settings.companySignature || ''}
                onChange={async (signature) => {
                  await updateSettings({ companySignature: signature })
                  if (signature) {
                    toast.success('Company signature saved for all invoices')
                  }
                }}
                width={300}
                height={150}
                showClearButton={false}
              />
              <p className="text-xs text-gray-500 mt-2">This signature will be used for all invoices</p>
            </div>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white">
          <h4 className="font-semibold mb-3 text-gray-900 text-base">Total ( ₹ )</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Taxable:</span>
              <span className="font-medium">{formatCurrency(derived.totals.taxable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CGST:</span>
              <span className="font-medium">{formatCurrency(derived.totals.cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SGST:</span>
              <span className="font-medium">{formatCurrency(derived.totals.sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IGST:</span>
              <span className="font-medium">{formatCurrency(derived.totals.igst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Round Off:</span>
              <span className="font-medium">{formatCurrency(derived.totals.roundOff)}</span>
            </div>
            <div className="pt-2 border-t border-dashed border-gray-200">
              <label className="block text-xs font-medium text-gray-700 mb-1">Discount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => {
                    const value = Math.max(0, Number(e.target.value) || 0)
                    setDiscountAmount(Math.min(value, derived.totals.grandTotal))
                  }}
                  className="w-full pl-8"
                  step="0.01"
                  min="0"
                  max={derived.totals.grandTotal}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Flat amount reduced from the total.</p>
            </div>
            {totalsWithDiscount.discount > 0 && (
              <div className="flex justify-between text-sm text-rose-600 font-medium">
                <span>Discount Applied:</span>
                <span>-{formatCurrency(totalsWithDiscount.discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300 mt-2">
              <span className="font-semibold text-gray-900">Grand Total:</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(totalsWithDiscount.grandTotal)}</span>
            </div>
            <div className="pt-2 sm:pt-3 border-t border-gray-300 mt-2 sm:mt-3 space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-0 mb-2 sm:mb-3">
                <label className="block text-xs font-semibold text-gray-700">Payment Methods</label>
                <button
                  type="button"
                  onClick={() => {
                    const remaining = totalsWithDiscount.grandTotal - amountPaid
                    if (remaining > 0) {
                      setPaymentMethods([...paymentMethods, { method: 'Cash', amount: remaining, reference: '' }])
                    } else {
                      setPaymentMethods([...paymentMethods, { method: 'Cash', amount: 0, reference: '' }])
                    }
                  }}
                  className="btn-primary flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 text-xs font-medium rounded-md shadow-sm hover:shadow transition-all"
                >
                  <svg className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Payment</span>
                </button>
              </div>
              
              {paymentMethods.length === 0 ? (
                <div className="text-center py-3 px-3 sm:py-6 sm:px-4 bg-gray-50 rounded-md sm:rounded-lg border border-dashed sm:border-2 border-gray-300">
                  <svg className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">No payment methods</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Tap "Add Payment" to add</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {paymentMethods.map((pm, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-md sm:rounded-lg p-2 sm:p-2.5 shadow-sm">
                      {/* Mobile Layout */}
                      <div className="block sm:hidden space-y-2">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={pm.method}
                            onChange={(e) => {
                              const updated = [...paymentMethods]
                              updated[idx].method = e.target.value
                              setPaymentMethods(updated)
                            }}
                            className="flex-1 text-xs font-medium bg-white border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Finance Company">Finance Company</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Card">Card (Debit/Credit)</option>
                            <option value="Other">Other</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethods(paymentMethods.filter((_, i) => i !== idx))
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {pm.method === 'Finance Company' && (
                          <div>
                            <input
                              type="text"
                              placeholder="Company name"
                              value={pm.companyName || ''}
                              onChange={(e) => {
                                const updated = [...paymentMethods]
                                updated[idx].companyName = e.target.value
                                setPaymentMethods(updated)
                              }}
                              className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                            />
                          </div>
                        )}
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">₹</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={pm.amount || ''}
                            onChange={(e) => {
                              const value = Math.max(0, Number(e.target.value) || 0)
                              const updated = [...paymentMethods]
                              updated[idx].amount = value
                              setPaymentMethods(updated)
                            }}
                            max={totalsWithDiscount.grandTotal}
                            className="w-full text-xs font-semibold bg-white border border-gray-300 rounded px-7 pr-2 py-1.5 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Ref/Note (optional)"
                            value={pm.reference || ''}
                            onChange={(e) => {
                              const updated = [...paymentMethods]
                              updated[idx].reference = e.target.value
                              setPaymentMethods(updated)
                            }}
                            className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                          />
                        </div>
                      </div>
                      
                      {/* Desktop Layout */}
                      <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-end">
                        <div className="col-span-3">
                          <select
                            value={pm.method}
                            onChange={(e) => {
                              const updated = [...paymentMethods]
                              updated[idx].method = e.target.value
                              setPaymentMethods(updated)
                            }}
                            className="w-full text-xs font-medium bg-white border border-gray-300 rounded-md px-2 py-2 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Finance Company">Finance Company</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Card">Card (Debit/Credit)</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        {pm.method === 'Finance Company' && (
                          <div className="col-span-2">
                            <input
                              type="text"
                              placeholder="Company name"
                              value={pm.companyName || ''}
                              onChange={(e) => {
                                const updated = [...paymentMethods]
                                updated[idx].companyName = e.target.value
                                setPaymentMethods(updated)
                              }}
                              className="w-full text-xs bg-white border border-gray-300 rounded-md px-2 py-2 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                            />
                          </div>
                        )}
                        <div className={pm.method === 'Finance Company' ? 'col-span-3' : 'col-span-4'}>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={pm.amount || ''}
                              onChange={(e) => {
                                const value = Math.max(0, Number(e.target.value) || 0)
                                const updated = [...paymentMethods]
                                updated[idx].amount = value
                                setPaymentMethods(updated)
                              }}
                              max={totalsWithDiscount.grandTotal}
                              className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-md pl-7 pr-2 py-2 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                        <div className={pm.method === 'Finance Company' ? 'col-span-3' : 'col-span-4'}>
                          <input
                            type="text"
                            placeholder="Ref/Note"
                            value={pm.reference || ''}
                            onChange={(e) => {
                              const updated = [...paymentMethods]
                              updated[idx].reference = e.target.value
                              setPaymentMethods(updated)
                            }}
                            className="w-full text-xs bg-white border border-gray-300 rounded-md px-2 py-2 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethods(paymentMethods.filter((_, i) => i !== idx))
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className={`font-medium ${amountPaid > totalsWithDiscount.grandTotal ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(amountPaid)}
                  </span>
                </div>
                {amountPaid > totalsWithDiscount.grandTotal && (
                  <p className="text-xs text-red-600 italic">
                    ⚠️ Total paid exceeds invoice amount
                  </p>
                )}
                <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Outstanding:</span>
                <span className={`text-lg font-semibold ${
                    (totalsWithDiscount.grandTotal - amountPaid) > 0 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                    {formatCurrency(Math.max(0, totalsWithDiscount.grandTotal - amountPaid))}
                </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Invoice Preview</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <PDFGenerator invoice={invoicePreview} />
            <PrintInvoice invoice={invoicePreview} />
            <WhatsAppShare invoice={invoicePreview} />
          </div>
        </div>
        <InvoicePreview invoice={invoicePreview} />
      </section>
    </div>
  )
}

