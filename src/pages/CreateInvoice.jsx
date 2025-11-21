import { useEffect, useMemo, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../components/ToastContainer'
import PDFGenerator from '../components/PDFGenerator'
import WhatsAppShare from '../components/WhatsAppShare'
import PrintInvoice from '../components/PrintInvoice'
import InvoicePreview from '../components/InvoicePreview'
import PageHeader from '../components/PageHeader'
import { calculateInvoiceTotals, formatCurrency } from '../lib/taxUtils'

const blankItem = {
  productName: '',
  description: '',
  hsn: '',
  qty: 1,
  rate: 0,
  taxPercent: 18,
}

export default function CreateInvoice() {
  const { customers, products, settings, saveInvoice, invoices, upsertCustomer } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const { invoiceId } = useParams()
  const editingInvoice = invoiceId ? invoices.find((inv) => inv.id === invoiceId) : null
  const [customerId, setCustomerId] = useState('')
  const [customCustomer, setCustomCustomer] = useState({ name: '', email: '', phone: '', state: settings.companyState, gstin: '', address: '', aadhaar: '', dob: '' })
  const [items, setItems] = useState([blankItem])
  const [notes, setNotes] = useState('Thanks for your business.')
  const [reverseCharge, setReverseCharge] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [terms, setTerms] = useState('Due on Receipt')
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amountPaid, setAmountPaid] = useState(0)
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [productSuggestions, setProductSuggestions] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [activeItemIndex, setActiveItemIndex] = useState(null)
  const selectedCustomer = customerId ? customers.find((c) => c.id === customerId) : null

  // Update customerId when customers list changes (e.g., after adding a new customer)
  // Calculate due date based on terms
  useEffect(() => {
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
    setDueDate(format(calculatedDueDate, 'yyyy-MM-dd'))
  }, [date, terms])

  useEffect(() => {
    if (!editingInvoice) {
      // Reset form for new invoice
      setCustomerId('')
      setCustomCustomer({ name: '', email: '', phone: '', state: settings.companyState, gstin: '', address: '', aadhaar: '', dob: '' })
      setItems([blankItem])
      setNotes('Thanks for your business.')
      setReverseCharge(false)
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setTerms('Due on Receipt')
      setDueDate(format(new Date(), 'yyyy-MM-dd'))
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
    setDate(editingInvoice.date || format(new Date(), 'yyyy-MM-dd'))
    setTerms(editingInvoice.terms || 'Due on Receipt')
    setDueDate(editingInvoice.dueDate || format(new Date(), 'yyyy-MM-dd'))
    setAmountPaid(editingInvoice.amountPaid || 0)
  }, [editingInvoice, customers, settings.companyState])

  const derived = useMemo(
    () =>
      calculateInvoiceTotals(
        items,
        selectedCustomer?.state || customCustomer.state || settings.companyState,
        settings.companyState,
      ),
    [items, selectedCustomer, customCustomer, settings],
  )

  const invoicePreview = useMemo(
    () => ({
      id: editingInvoice?.id || 'preview',
      invoiceNo: editingInvoice?.invoiceNo || 'Preview',
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
      totals: derived.totals,
      notes: notes,
      reverseCharge: reverseCharge,
      amountPaid: Number(amountPaid) || 0,
    }),
    [editingInvoice, date, terms, dueDate, selectedCustomer, customCustomer, settings.companyState, derived, notes, reverseCharge, amountPaid],
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
    const customerPhone = selectedCustomer?.phone || customCustomer.phone
    
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
      customerData = selectedCustomer
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

    const grandTotal = derived.totals.grandTotal || 0
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

    const payload = {
      id: editingInvoice?.id,
      invoiceNo: editingInvoice?.invoiceNo,
      date,
      terms,
      dueDate,
      customer: customerData,
      items,
      notes,
      reverseCharge,
      amountPaid: finalAmountPaid,
    }
    
    try {
      const savedInvoice = await saveInvoice(payload, finalStatus)
      const statusText = finalStatus === 'draft' ? 'saved as draft' : finalStatus === 'paid' ? 'saved and marked paid' : 'saved and marked sent'
      toast.success(`Invoice ${statusText}${customerData.id ? ` • Linked to ${customerData.name}` : ''}`)
    navigate('/invoices')
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast.error('Failed to save invoice. Please try again.')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full md:max-w-7xl mx-auto">
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
            {customers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                  💡 Tip: Add customers from the Customers page first
              </p>
            )}
            </div>
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="10 digit phone"
                  value={customCustomer.phone}
                  onChange={(e) => setCustomCustomer((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
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
                <span className="text-gray-500 block text-xs mb-1">Phone</span>
                <span className="text-gray-900">{selectedCustomer.phone || '--'}</span>
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
          <div className="relative w-full max-w-xs sm:max-w-none sm:w-80 mx-auto sm:mx-0">
            <input
              type="text"
              className="w-full text-sm sm:text-base py-2 sm:py-2.5"
              placeholder="Search products to add..."
              value={productSearch}
              onChange={(e) => {
                const value = e.target.value
                setProductSearch(value)
                setActiveItemIndex(null) // Clear active item index when using top search
                
                if (value.length >= 1) {
                  const matches = products.filter(p => 
                    p.name.toLowerCase().includes(value.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(value.toLowerCase()) ||
                    p.hsn?.includes(value)
                  ).slice(0, 8)
                  setProductSuggestions(matches)
                  setShowProductSuggestions(true)
                } else {
                  setShowProductSuggestions(false)
                }
              }}
              onFocus={() => {
                setActiveItemIndex(null) // Clear active item index when focusing top search
                if (products.length > 0 && productSearch.length === 0) {
                  setProductSuggestions(products.slice(0, 8))
                  setShowProductSuggestions(true)
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (!document.activeElement?.closest('.product-suggestion-dropdown')) {
                    setShowProductSuggestions(false)
                  }
                }, 250)
              }}
            />
            {showProductSuggestions && productSuggestions.length > 0 && activeItemIndex === null && (
              <div 
                className="product-suggestion-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
              >
                {productSuggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      addProductToItems(product.id)
                      setProductSearch('')
                      setShowProductSuggestions(false)
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {product.sku && `SKU: ${product.sku} • `}
                          ₹{product.unit_price} • Tax: {product.tax_percent}%
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        product.stock === 0 ? 'bg-red-100 text-red-700' :
                        product.stock < 10 ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {product.stock} in stock
                      </span>
                    </div>
                  </button>
            ))}
              </div>
            )}
          </div>
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
                          setProductSearch('') // Clear top search when typing in item row
                          
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
                          setProductSearch('') // Clear top search when focusing item row
                          setActiveItemIndex(idx)
                          if (item.productName && item.productName.length >= 1) {
                            const matches = products.filter(p => 
                              p.name.toLowerCase().includes(item.productName.toLowerCase())
                            ).slice(0, 6)
                            if (matches.length > 0) {
                              setProductSuggestions(matches)
                              setShowProductSuggestions(true)
                            }
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    className="w-full"
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
            <div className="flex justify-between pt-2 border-t border-gray-300 mt-2">
              <span className="font-semibold text-gray-900">Grand Total:</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(derived.totals.grandTotal)}</span>
            </div>
            <div className="pt-3 border-t border-gray-300 mt-3 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(Number(e.target.value) || 0, derived.totals.grandTotal))
                      setAmountPaid(value)
                    }}
                    className="w-full pl-8"
                    step="0.01"
                    max={derived.totals.grandTotal}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAmountPaid(derived.totals.grandTotal)}
                  className="text-xs text-brand-primary hover:underline mt-1"
                >
                  Mark as fully paid
                </button>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Outstanding:</span>
                <span className={`text-lg font-semibold ${
                  (derived.totals.grandTotal - (Number(amountPaid) || 0)) > 0 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {formatCurrency(Math.max(0, derived.totals.grandTotal - (Number(amountPaid) || 0)))}
                </span>
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

