import { useState, useMemo, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../components/ToastContainer'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import PageHeader from '../components/PageHeader'
import EmptyState, { icons } from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { formatCurrency } from '../lib/taxUtils'

const emptyProduct = {
  id: '',
  name: '',
  sku: '',
  description: '',
  hsn: '',
  unit_price: 0,
  cost_price: 0,
  tax_percent: 18,
  stock: 0,
  unit: 'nos',
}

export default function Products() {
  const { products, upsertProduct, deleteProduct, savePurchase, settings } = useData()
  const toast = useToast()
  const [form, setForm] = useState(emptyProduct)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [showPurchases, setShowPurchases] = useState(settings.enablePurchases)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null })
  const [purchaseRow, setPurchaseRow] = useState({ 
    productId: '', 
    productName: '', // For new product
    supplier: '', 
    billNo: '', 
    date: new Date().toISOString().slice(0, 10),
    qty: 1, 
    rate: 0, 
    taxPercent: 18,
    hsn: '', // For new product
    description: '' // For new product
  })
  const [purchaseErrors, setPurchaseErrors] = useState({})
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [taxFilter, setTaxFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = debouncedSearch.toLowerCase()
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.hsn?.toLowerCase().includes(query)
      
      const matchesTax = 
        taxFilter === 'all' ||
        (taxFilter === '0' && product.tax_percent === 0) ||
        (taxFilter === '5' && product.tax_percent === 5) ||
        (taxFilter === '12' && product.tax_percent === 12) ||
        (taxFilter === '18' && product.tax_percent === 18) ||
        (taxFilter === '28' && product.tax_percent === 28)
      
      const stockValue = Number(product.stock) || 0
      const matchesStock = 
        stockFilter === 'all' ||
        (stockFilter === 'in-stock' && stockValue > 0) ||
        (stockFilter === 'low-stock' && stockValue > 0 && stockValue < 10) ||
        (stockFilter === 'out-of-stock' && stockValue === 0)
      
      return matchesSearch && matchesTax && matchesStock
    })
  }, [products, debouncedSearch, taxFilter, stockFilter])

  const hasActiveFilters = taxFilter !== 'all' || stockFilter !== 'all'

  const validateForm = () => {
    const newErrors = {}
    if (!form.name.trim()) {
      newErrors.name = 'Product name is required'
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
      // Ensure all numeric fields are properly converted to numbers
      const productToSave = {
        ...form,
        unit_price: Number(form.unit_price) || 0,
        cost_price: Number(form.cost_price) || 0,
        tax_percent: Number(form.tax_percent) || 0,
        stock: Number(form.stock) || 0,
      }
      await upsertProduct(productToSave)
      setForm(emptyProduct)
      setErrors({})
      setShowForm(false)
      toast.success(`Item "${form.name}" saved successfully!`)
    } catch (error) {
      toast.error('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const handleEditProduct = (product) => {
    setForm(product)
    setShowForm(true)
    setTimeout(() => {
      document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }

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
        setForm(emptyProduct)
        setErrors({})
      }
    },
  })

  const validatePurchase = () => {
    const errors = {}
    if (!purchaseRow.supplier.trim()) {
      errors.supplier = 'Supplier name is required'
    }
    // Bill No is optional - removed mandatory validation
    if (isNewProduct) {
      if (!purchaseRow.productName?.trim()) {
        errors.productName = 'Product name is required'
      }
    } else {
      if (!purchaseRow.productId) {
        errors.productId = 'Please select a product'
      }
    }
    if (purchaseRow.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0'
    }
    if (purchaseRow.rate <= 0) {
      errors.rate = 'Rate must be greater than 0'
    }
    setPurchaseErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePurchase = async (event) => {
    event.preventDefault()
    
    if (!validatePurchase()) {
      toast.error('Please fix the errors before saving purchase')
      return
    }

    try {
      let productId = purchaseRow.productId
      let productName = ''
      let productToUpdate = null

      if (isNewProduct) {
        // Create new product first
        if (!purchaseRow.productName?.trim()) {
          setPurchaseErrors((prev) => ({ ...prev, productName: 'Product name is required' }))
          return
        }

        // Check if product with same name already exists
        const existingProduct = products.find(p => p.name.toLowerCase() === purchaseRow.productName.trim().toLowerCase())
        if (existingProduct) {
          toast.error('Product with this name already exists. Please select it from the list.')
          setIsNewProduct(false)
          setPurchaseRow({ ...purchaseRow, productId: existingProduct.id, productName: '', hsn: '', description: '' })
          return
        }

        // Create new product
        const newProduct = {
          name: purchaseRow.productName.trim(),
          sku: '',
          description: purchaseRow.description || '',
          hsn: purchaseRow.hsn || '',
          unit_price: purchaseRow.rate * 1.2, // Set selling price 20% above cost
          cost_price: purchaseRow.rate,
          tax_percent: purchaseRow.taxPercent,
          stock: Number(purchaseRow.qty),
          unit: 'nos',
        }

        const createdProduct = await upsertProduct(newProduct)
        productId = createdProduct.id
        productName = createdProduct.name
        productToUpdate = createdProduct
      } else {
        // Use existing product
        const selectedProduct = products.find(p => p.id === purchaseRow.productId)
        if (!selectedProduct) {
          toast.error('Selected product not found')
          return
        }
        productName = selectedProduct.name
        productToUpdate = selectedProduct
      }

      // Save purchase record
    await savePurchase({
        supplier: purchaseRow.supplier.trim(),
        billNo: purchaseRow.billNo?.trim() || '',
        items: [{
          productId: productId,
          description: productName,
          qty: Number(purchaseRow.qty),
          rate: Number(purchaseRow.rate),
          taxPercent: Number(purchaseRow.taxPercent),
          hsn: purchaseRow.hsn || productToUpdate?.hsn || '',
        }],
      totals: {
        taxable: purchaseRow.qty * purchaseRow.rate,
        tax: (purchaseRow.qty * purchaseRow.rate * purchaseRow.taxPercent) / 100,
        grandTotal: purchaseRow.qty * purchaseRow.rate * (1 + purchaseRow.taxPercent / 100),
      },
        date: purchaseRow.date,
      })

      // Update product stock
      await upsertProduct({
        ...productToUpdate,
        stock: (Number(productToUpdate.stock) || 0) + Number(purchaseRow.qty),
      })

      // Reset form
      setPurchaseRow({ 
        productId: '', 
        productName: '',
        hsn: '',
        description: '',
        supplier: '', 
        billNo: '', 
      date: new Date().toISOString().slice(0, 10),
        qty: 1, 
        rate: 0, 
        taxPercent: 18 
      })
      const wasNewProduct = isNewProduct
      setPurchaseErrors({})
      setIsNewProduct(false)
      toast.success(`Purchase recorded! ${wasNewProduct ? 'New product created and ' : ''}Stock updated for ${productName}`)
    } catch (error) {
      console.error('Error saving purchase:', error)
      toast.error('Failed to save purchase. Please try again.')
    }
  }

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Items"
        subtitle={`${filteredProducts.length} active items`}
        action={() => {
              setForm(emptyProduct)
              setErrors({})
              setShowForm(true)
              setTimeout(() => {
                document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }, 100)
            }}
        actionLabel="Add Item"
        actionIcon={
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        secondaryAction={() => setShowPurchases((prev) => !prev)}
        secondaryLabel={showPurchases ? 'Hide Purchases' : 'Purchase Register'}
      />

      {/* Zoho-style Compact Search Bar */}
      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <div className="relative w-full max-w-xs sm:max-w-none sm:flex-1">
          <input
            className="w-full pr-7 sm:pr-9 md:pr-10 text-sm sm:text-base py-2 sm:py-2.5 pl-3 sm:pl-[2.25rem]"
            placeholder="Search in Items ( / )"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate</label>
              <select value={taxFilter} onChange={(e) => setTaxFilter(e.target.value)} className="w-full">
                <option value="all">All Rates</option>
                <option value="0">0% - Non-taxable</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stock Status</label>
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="w-full">
                <option value="all">All</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock (&lt;10)</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setTaxFilter('all')
                  setStockFilter('all')
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

      {/* Collapsible Item Form */}
      {(showForm || form.id) && (
        <section id="item-form" className="glass-panel p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">{form.id ? 'Edit Item' : 'New Item'}</h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyProduct)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
          <input
                placeholder="Enter item name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
                className={`w-full ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                className="w-full"
              >
                <option value="nos">nos</option>
                <option value="box">box</option>
                <option value="dz">dozen</option>
                <option value="kg">kg</option>
                <option value="pcs">pieces</option>
                <option value="set">set</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
          <input
                placeholder="Item Code/SKU"
            value={form.sku}
            onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                className="w-full"
          />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">HSN/SAC</label>
          <input
                placeholder="HSN or SAC code"
            value={form.hsn}
            onChange={(e) => setForm((prev) => ({ ...prev, hsn: e.target.value }))}
                className="w-full"
          />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
          <input
            type="number"
                  placeholder="0.00"
            value={form.unit_price}
            onChange={(e) => setForm((prev) => ({ ...prev, unit_price: Number(e.target.value) }))}
                  className="w-full pl-8"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
          <input
            type="number"
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={(e) => setForm((prev) => ({ ...prev, cost_price: Number(e.target.value) }))}
                  className="w-full pl-8"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <select
            value={form.tax_percent}
            onChange={(e) => setForm((prev) => ({ ...prev, tax_percent: Number(e.target.value) }))}
                className="w-full"
              >
                <option value="0">0% - Non-taxable</option>
                <option value="5">5% - GST 5%</option>
                <option value="12">12% - GST 12%</option>
                <option value="18">18% - GST 18%</option>
                <option value="28">28% - GST 28%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Opening Stock</label>
          <input
            type="number"
                placeholder="0"
            value={form.stock}
            onChange={(e) => setForm((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                className="w-full"
          />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                placeholder="Optional description"
                value={form.description || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                form.id ? 'Update Item' : 'Save Item'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(emptyProduct)
                setErrors({})
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
      )}

      {showPurchases && (
        <section className="glass-panel p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Purchase Register</h3>
            <p className="text-xs text-gray-500">Record purchases to track ITC and update stock</p>
          </div>
          <form className="space-y-4" onSubmit={handlePurchase}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-xs font-medium text-gray-700">Product *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewProduct(!isNewProduct)
                      if (!isNewProduct) {
                        setPurchaseRow({ ...purchaseRow, productId: '', productName: '', hsn: '', description: '' })
                      } else {
                        setPurchaseRow({ ...purchaseRow, productName: '', hsn: '', description: '' })
                      }
                      setPurchaseErrors({})
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {isNewProduct ? 'Select Existing' : 'Add New Product'}
                  </button>
                </div>
                {isNewProduct ? (
                  <>
                    <input
                      type="text"
                      value={purchaseRow.productName || ''}
                      onChange={(e) => {
                        setPurchaseRow({ ...purchaseRow, productName: e.target.value })
                        if (purchaseErrors.productName) setPurchaseErrors((prev) => ({ ...prev, productName: '' }))
                      }}
                      placeholder="Enter product name"
                      className={`w-full ${purchaseErrors.productName ? 'border-red-500' : ''}`}
                      required
                    />
                    {purchaseErrors.productName && <p className="text-xs text-red-600 mt-1">{purchaseErrors.productName}</p>}
                  </>
                ) : (
                  <>
                    <select
                      value={purchaseRow.productId}
                      onChange={(e) => {
                        const product = products.find(p => p.id === e.target.value)
                        setPurchaseRow((prev) => ({ 
                          ...prev, 
                          productId: e.target.value,
                          rate: product ? product.cost_price || 0 : 0,
                          taxPercent: product ? product.tax_percent || 18 : 18
                        }))
                        if (purchaseErrors.productId) setPurchaseErrors((prev) => ({ ...prev, productId: '' }))
                      }}
                      className={`w-full ${purchaseErrors.productId ? 'border-red-500' : ''}`}
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </option>
                      ))}
                    </select>
                    {purchaseErrors.productId && <p className="text-xs text-red-600 mt-1">{purchaseErrors.productId}</p>}
                  </>
                )}
              </div>
              {isNewProduct && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={purchaseRow.hsn || ''}
                      onChange={(e) => setPurchaseRow({ ...purchaseRow, hsn: e.target.value })}
                      placeholder="Enter HSN code"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={purchaseRow.description || ''}
                      onChange={(e) => setPurchaseRow({ ...purchaseRow, description: e.target.value })}
                      placeholder="Product description"
                      className="w-full"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date *</label>
                <input
                  type="date"
                  value={purchaseRow.date}
                  onChange={(e) => setPurchaseRow((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Supplier *</label>
            <input
                  placeholder="Supplier name"
              value={purchaseRow.supplier}
                  onChange={(e) => {
                    setPurchaseRow((prev) => ({ ...prev, supplier: e.target.value }))
                    if (purchaseErrors.supplier) setPurchaseErrors((prev) => ({ ...prev, supplier: '' }))
                  }}
                  className={`w-full ${purchaseErrors.supplier ? 'border-red-500' : ''}`}
                  required
                />
                {purchaseErrors.supplier && <p className="text-xs text-red-600 mt-1">{purchaseErrors.supplier}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bill No</label>
            <input
                  placeholder="Purchase bill number (optional)"
              value={purchaseRow.billNo}
                  onChange={(e) => {
                    setPurchaseRow((prev) => ({ ...prev, billNo: e.target.value }))
                    if (purchaseErrors.billNo) setPurchaseErrors((prev) => ({ ...prev, billNo: '' }))
                  }}
                  className={`w-full ${purchaseErrors.billNo ? 'border-red-500' : ''}`}
            />
                {purchaseErrors.billNo && <p className="text-xs text-red-600 mt-1">{purchaseErrors.billNo}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              placeholder="Qty"
              value={purchaseRow.qty}
                  onChange={(e) => {
                    setPurchaseRow((prev) => ({ ...prev, qty: Number(e.target.value) || 0 }))
                    if (purchaseErrors.qty) setPurchaseErrors((prev) => ({ ...prev, qty: '' }))
                  }}
                  className={`w-full ${purchaseErrors.qty ? 'border-red-500' : ''}`}
                  min="1"
                  step="1"
                  required
                />
                {purchaseErrors.qty && <p className="text-xs text-red-600 mt-1">{purchaseErrors.qty}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rate (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
                    placeholder="0.00"
              value={purchaseRow.rate}
                    onChange={(e) => {
                      setPurchaseRow((prev) => ({ ...prev, rate: Number(e.target.value) || 0 }))
                      if (purchaseErrors.rate) setPurchaseErrors((prev) => ({ ...prev, rate: '' }))
                    }}
                    className={`w-full pl-8 ${purchaseErrors.rate ? 'border-red-500' : ''}`}
                    min="0"
                    step="0.01"
                    required
            />
                </div>
                {purchaseErrors.rate && <p className="text-xs text-red-600 mt-1">{purchaseErrors.rate}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <select
              value={purchaseRow.taxPercent}
              onChange={(e) => setPurchaseRow((prev) => ({ ...prev, taxPercent: Number(e.target.value) }))}
                  className="w-full"
                >
                  <option value="0">0% - Non-taxable</option>
                  <option value="5">5% - GST 5%</option>
                  <option value="12">12% - GST 12%</option>
                  <option value="18">18% - GST 18%</option>
                  <option value="28">28% - GST 28%</option>
                </select>
              </div>
            </div>
            {purchaseRow.qty > 0 && purchaseRow.rate > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Taxable Amount:</span>
                  <span className="font-semibold">{formatCurrency(purchaseRow.qty * purchaseRow.rate)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-700">Tax ({purchaseRow.taxPercent}%):</span>
                  <span className="font-semibold">{formatCurrency((purchaseRow.qty * purchaseRow.rate * purchaseRow.taxPercent) / 100)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-blue-300">
                  <span className="text-gray-900 font-medium">Grand Total:</span>
                  <span className="font-bold text-brand-primary text-base">{formatCurrency(purchaseRow.qty * purchaseRow.rate * (1 + purchaseRow.taxPercent / 100))}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 sm:gap-3 justify-end">
              <button type="submit" className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                <span className="hidden sm:inline">Record Purchase</span>
                <span className="sm:hidden">Record</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPurchaseRow({ 
                    productId: '', 
                    productName: '',
                    hsn: '',
                    description: '',
                    supplier: '', 
                    billNo: '', 
                    date: new Date().toISOString().slice(0, 10),
                    qty: 1, 
                    rate: 0, 
                    taxPercent: 18 
                  })
                  setPurchaseErrors({})
                  setIsNewProduct(false)
                }}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Clear
            </button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-4">
            💡 Purchase will automatically update product stock. Use this for ITC tracking and purchase history.
          </p>
        </section>
      )}

      {/* Desktop table */}
      <section className="glass-panel overflow-x-auto hidden md:block">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="min-w-[200px]">Item Name</th>
                <th className="min-w-[100px]">SKU</th>
                <th className="min-w-[100px]">HSN/SAC</th>
                <th className="text-right min-w-[120px]">Selling Price</th>
                <th className="text-center min-w-[100px]">Tax Rate</th>
                <th className="text-right min-w-[100px]">Stock on Hand</th>
                <th className="min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="cursor-pointer" onClick={(e) => {
                  if (!e.target.closest('.action-buttons')) {
                    handleEditProduct(product)
                  }
                }}>
                  <td className="font-medium text-brand-primary hover:underline">{product.name}</td>
                  <td className="text-gray-600">{product.sku || '--'}</td>
                  <td className="text-gray-600">{product.hsn || '--'}</td>
                  <td className="text-right font-semibold text-gray-900">{formatCurrency(product.unit_price)}</td>
                  <td className="text-center">
                    <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {product.tax_percent}% GST
                    </span>
                  </td>
                  <td className={`text-right font-semibold ${
                    (Number(product.stock) || 0) === 0 
                      ? 'text-red-600' 
                      : (Number(product.stock) || 0) < 10 
                        ? 'text-orange-600' 
                        : 'text-green-600'
                  }`}>
                    {Number(product.stock) || 0} {product.unit || 'nos'}
                  </td>
                  <td className="action-buttons py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, product })}
                      className="btn-danger !py-1.5 !text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredProducts.length && products.length > 0 && (
                <tr>
                  <td colSpan="7" className="p-0">
                    <EmptyState
                      icon={icons.search}
                      title="No matches found"
                      message="Try adjusting your search or filters to find what you're looking for."
                    />
                  </td>
                </tr>
              )}
              {!products.length && (
                <tr>
                  <td colSpan="7" className="p-0">
                    <EmptyState
                      icon={icons.product}
                      title="No items yet"
                      message="Add your first item using the form above to start managing inventory."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="glass-panel p-4 cursor-pointer"
            onClick={() => handleEditProduct(product)}
          >
            {/* Header Section */}
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-primary text-base leading-tight">{product.name}</p>
                {product.sku && <p className="text-xs text-gray-500 mt-1.5 leading-snug">SKU: {product.sku}</p>}
              </div>
              <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex-shrink-0 ml-2">
                {product.tax_percent}% GST
              </span>
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-gray-500 text-xs block leading-tight">Selling Price</span>
                <span className="font-bold text-gray-900 text-base block leading-tight">{formatCurrency(product.unit_price)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500 text-xs block leading-tight">Stock</span>
                <span className={`font-bold text-base block leading-tight ${
                  (Number(product.stock) || 0) === 0 
                    ? 'text-red-600' 
                    : (Number(product.stock) || 0) < 10 
                      ? 'text-orange-600' 
                      : 'text-green-600'
                }`}>
                  {Number(product.stock) || 0} {product.unit || 'nos'}
                </span>
              </div>
              {product.hsn && (
                <div className="col-span-2 space-y-1">
                  <span className="text-gray-500 text-xs block leading-tight">HSN/SAC</span>
                  <span className="text-gray-900 text-sm font-medium block leading-tight">{product.hsn}</span>
                </div>
              )}
            </div>
            
            {/* Delete Button for Mobile */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setDeleteModal({ isOpen: true, product })}
                className="btn-danger !py-1.5 !px-2 !text-[10px]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!filteredProducts.length && products.length > 0 && (
          <div className="glass-panel">
            <EmptyState
              icon={icons.search}
              title="No matches found"
              message="Try adjusting your search or filters."
            />
          </div>
        )}
        {!products.length && (
          <div className="glass-panel">
            <EmptyState
              icon={icons.product}
              title="No items yet"
              message="Add your first item using the form above to start managing inventory."
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null })}
        onConfirm={async () => {
          if (deleteModal.product) {
            await deleteProduct(deleteModal.product.id)
            toast.success('Product deleted')
            setDeleteModal({ isOpen: false, product: null })
          }
        }}
        title="Delete Product?"
        message={`Are you sure you want to delete product "${deleteModal.product?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  )
}

