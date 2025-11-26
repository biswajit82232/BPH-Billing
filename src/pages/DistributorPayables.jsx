import { useMemo, useState, useCallback } from 'react'
import { useData } from '../context/DataContext'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { formatCurrency, formatInvoiceDate } from '../lib/taxUtils'
import { useToast } from '../components/ToastContainer'

export default function DistributorPayables() {
  const {
    calculateDistributorPayables,
    recordDistributorSettlement,
    deleteDistributorSettlement,
    deleteDistributor,
    distributors,
    invoices,
  } = useData()

  const toast = useToast()
  const payables = useMemo(() => calculateDistributorPayables(), [calculateDistributorPayables])
  const [selectedDistributorId, setSelectedDistributorId] = useState(null)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [editingSettlement, setEditingSettlement] = useState(null)
  const [settlementForm, setSettlementForm] = useState({
    distributorId: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'cash',
    note: '',
    invoiceIds: [],
  })
  const [filter, setFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, settlementId: null })
  const [confirmDeleteDistributor, setConfirmDeleteDistributor] = useState({ isOpen: false, distributorId: null, distributorName: '' })
  const [showAllDistributors, setShowAllDistributors] = useState(false)

  const selectedDistributor = payables.find(p => p.distributor.id === selectedDistributorId)
  // Filter out already-settled invoices - only show unsettled ones
  const settledInvoiceIds = new Set((selectedDistributor?.settledInvoices || []).map(inv => inv.invoiceId))
  const selectedDistributorInvoices = (selectedDistributor?.invoices || []).filter(inv => !settledInvoiceIds.has(inv.invoiceId))
  const selectedDistributorItems = selectedDistributor?.items || []
  const selectedDistributorSettlements = selectedDistributor?.settlements || []
  const selectedDistributorSettledInvoices = selectedDistributor?.settledInvoices || []

  const filteredPayables = payables.filter(entry =>
    entry.distributor.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const totalOwed = payables.reduce((sum, entry) => sum + entry.totalOwed, 0)
  const totalInventoryValue = payables.reduce((sum, entry) => sum + (entry.inventoryValue || 0), 0)
  const totalSettled = payables.reduce(
    (sum, entry) =>
      sum + entry.settlements.reduce((settlementSum, settlement) => settlementSum + (Number(settlement.amount) || 0), 0),
    0,
  )
  const projectedRemaining = useMemo(() => {
    if (!settlementForm.distributorId) return null
    const targetEntry = payables.find((entry) => entry.distributor.id === settlementForm.distributorId)
    if (!targetEntry) return null
    const baseOutstanding = targetEntry.totalOwed
    const previousAmount =
      editingSettlement && editingSettlement.distributorId === settlementForm.distributorId
        ? Number(editingSettlement.amount) || 0
        : 0
    const currentAmount = Number(settlementForm.amount) || 0
    return Math.max(baseOutstanding + previousAmount - currentAmount, 0)
  }, [editingSettlement, payables, settlementForm.amount, settlementForm.distributorId])

  const openSettlementModal = (distributorId, settlement = null) => {
    setSettlementForm({
      distributorId: settlement?.distributorId || distributorId || '',
      amount: settlement?.amount ? String(settlement.amount) : '',
      date: settlement?.date || new Date().toISOString().slice(0, 10),
      method: settlement?.method || 'cash',
      note: settlement?.note || '',
      invoiceIds: settlement?.invoiceIds || [],
    })
    setEditingSettlement(settlement)
    setShowSettlementModal(true)
  }

  const settlementInvoiceOptions = useMemo(() => {
    if (!settlementForm.distributorId) return []
    const payableEntry = payables.find(entry => entry.distributor.id === settlementForm.distributorId)
    if (!payableEntry) return []
    
    // Get all settled invoice IDs
    const allSettledInvoiceIds = new Set(payableEntry.settledInvoices.map(inv => inv.invoiceId))
    
    // When editing an existing settlement, get invoices that are part of this settlement
    const editingSettlementInvoiceIds = editingSettlement?.invoiceIds ? new Set(editingSettlement.invoiceIds) : new Set()
    
    // Filter invoices:
    // 1. If editing, include invoices that are part of this settlement (so they can be modified)
    // 2. If creating new, exclude ALL settled invoices
    const availableInvoices = payableEntry.invoices.filter(inv => {
      // If editing an existing settlement, include invoices that are part of it
      if (editingSettlement?.id && editingSettlementInvoiceIds.has(inv.invoiceId)) {
        return true
      }
      // Otherwise, exclude all settled invoices
      return !allSettledInvoiceIds.has(inv.invoiceId)
    })
    
    // Enrich invoice options with full invoice data for item names
    return availableInvoices.map(inv => {
      const fullInvoice = invoices.find(i => i.id === inv.invoiceId)
      return {
        ...inv,
        items: fullInvoice?.items || inv.items || [],
      }
    })
  }, [payables, settlementForm.distributorId, invoices, editingSettlement])

  const toggleSettlementInvoice = useCallback((invoiceId) => {
    setSettlementForm((prev) => {
      const exists = prev.invoiceIds.includes(invoiceId)
      return {
        ...prev,
        invoiceIds: exists ? prev.invoiceIds.filter(id => id !== invoiceId) : [...prev.invoiceIds, invoiceId],
      }
    })
  }, [])

  const handleSettlementSubmit = async (event) => {
    event.preventDefault()

    if (!settlementForm.distributorId) {
      toast.error('Select a distributor before recording settlement')
      return
    }
    const numericAmount = Number(settlementForm.amount)
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Enter a valid settlement amount greater than zero')
      return
    }

    try {
      await recordDistributorSettlement({
        ...settlementForm,
        id: editingSettlement?.id,
        amount: numericAmount,
      })
      toast.success(editingSettlement ? 'Settlement updated successfully' : 'Settlement recorded successfully')
      setShowSettlementModal(false)
      setEditingSettlement(null)
    } catch (error) {
      console.error('Failed to record distributor settlement:', error)
      toast.error(error?.message || 'Failed to save settlement. Please try again.')
    }
  }

  const handleDeleteSettlement = async () => {
    if (!confirmDelete.settlementId) return
    try {
      await deleteDistributorSettlement(confirmDelete.settlementId)
      toast.success('Settlement deleted')
    } catch (error) {
      console.error('Failed to delete settlement:', error)
      toast.error('Could not delete settlement. Please try again.')
    } finally {
      setConfirmDelete({ isOpen: false, settlementId: null })
    }
  }

  const handleDeleteDistributor = async () => {
    if (!confirmDeleteDistributor.distributorId) return
    try {
      await deleteDistributor(confirmDeleteDistributor.distributorId)
      toast.success('Distributor deleted')
    } catch (error) {
      console.error('Failed to delete distributor:', error)
      toast.error('Could not delete distributor. Please try again.')
    } finally {
      setConfirmDeleteDistributor({ isOpen: false, distributorId: null, distributorName: '' })
    }
  }

  // Get all distributors (including ones with no balance)
  const allDistributorsList = useMemo(() => {
    const payablesMap = new Map(payables.map(p => [p.distributor.id, p]))
    return distributors.map(dist => ({
      ...dist,
      totalOwed: payablesMap.get(dist.id)?.totalOwed || 0,
      hasBalance: (payablesMap.get(dist.id)?.totalOwed || 0) > 0,
    }))
  }, [distributors, payables])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Distributor Payables"
        subtitle="Based on current inventory stock - shows what you owe for items you have in stock"
      />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Payable</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-gray-500 mt-1">After settlements</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Inventory Value</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">{formatCurrency(totalInventoryValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Current stock value</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Settlements Paid</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{formatCurrency(totalSettled)}</p>
          <p className="text-xs text-gray-500 mt-1">Total paid so far</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Distributors Owed</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {payables.filter(p => p.totalOwed > 0).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">With outstanding balance</p>
        </div>
      </section>

      <section className="glass-panel p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Distributors</h2>
          <input
            className="w-full sm:w-64"
            placeholder="Search distributors"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {filteredPayables.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
              </svg>
            }
            title="No Distributors Found"
            message="No distributor balances match your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Owed</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayables.map(entry => {
                  const invoiceDates = entry.invoices.map((inv) => new Date(inv.date || inv.createdAt || Date.now()).getTime())
                  const settlementDates = entry.settlements.map((settlement) => new Date(settlement.date || Date.now()).getTime())
                  const latestTimestamp = Math.max(...invoiceDates, ...settlementDates, 0)
                  const lastActivity =
                    latestTimestamp > 0 ? formatInvoiceDate(new Date(latestTimestamp).toISOString()) : '—'

                  return (
                    <tr key={entry.distributor.id}>
                      <td className="px-4 py-2">
                        <div className="relative pr-4">
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            {entry.distributor.name}
                            {entry.totalOwed > 0 && (
                              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Balance pending" />
                            )}
                          </p>
                          {entry.distributor.phone && (
                            <p className="text-xs text-gray-500">{entry.distributor.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-semibold text-gray-900">{formatCurrency(entry.totalOwed)}</p>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{entry.invoices.length}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{lastActivity}</td>
                      <td className="px-4 py-2 space-x-2">
                        <button
                          className="btn-secondary !py-1 !px-2 text-xs"
                          onClick={() => setSelectedDistributorId(entry.distributor.id)}
                        >
                          View Details
                        </button>
                        <button
                          className="btn-primary !py-1 !px-2 text-xs"
                          onClick={() => openSettlementModal(entry.distributor.id)}
                        >
                          Record Settlement
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* All Distributors Management Section */}
      <section className="glass-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">All Distributors</h2>
            <p className="text-xs text-gray-500 mt-1">Manage all distributors, including ones with no balance</p>
          </div>
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            onClick={() => setShowAllDistributors(!showAllDistributors)}
          >
            {showAllDistributors ? 'Hide' : 'Show All'}
          </button>
        </div>

        {showAllDistributors && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allDistributorsList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-center text-sm text-gray-500">
                      No distributors found
                    </td>
                  </tr>
                ) : (
                  allDistributorsList.map((distributor) => (
                    <tr key={distributor.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">{distributor.name}</p>
                        {distributor.contact && (
                          <p className="text-xs text-gray-500">{distributor.contact}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{distributor.phone || '-'}</td>
                      <td className="px-4 py-2">
                        <p className={`text-sm font-semibold ${distributor.hasBalance ? 'text-gray-900' : 'text-gray-400'}`}>
                          {formatCurrency(distributor.totalOwed)}
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                          onClick={() => setConfirmDeleteDistributor({
                            isOpen: true,
                            distributorId: distributor.id,
                            distributorName: distributor.name,
                          })}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedDistributor && (
        <section className="glass-panel p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {selectedDistributor.distributor.name}
                {selectedDistributor.totalOwed > 0 && (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Balance pending" />
                )}
              </h3>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <p className="text-sm text-gray-500">
                  Outstanding: <span className="font-semibold text-gray-900">{formatCurrency(selectedDistributor.totalOwed)}</span>
                </p>
                {selectedDistributor.inventoryValue > 0 && (
                  <p className="text-sm text-gray-500">
                    Inventory Value: <span className="font-semibold text-blue-600">{formatCurrency(selectedDistributor.inventoryValue)}</span>
                  </p>
                )}
                {selectedDistributor.distributor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <a
                      href={`tel:${selectedDistributor.distributor.phone}`}
                      className="inline-flex items-center gap-1 text-brand-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 5c0-1.1.9-2 2-2h2.3c.9 0 1.6.6 1.8 1.4L10 6c.2.8 0 1.5-.5 2l-.9.9c-.2.2-.2.5-.1.7 1.2 2.3 3.1 4.2 5.4 5.4.3.1.5.1.7-.1l.9-.9c.5-.5 1.2-.7 2-.5l1.6.4c.8.2 1.4.9 1.4 1.8V19c0 1.1-.9 2-2 2h-1C9.8 21 3 14.2 3 5z"
                        />
                      </svg>
                      Call
                    </a>
                    <a
                      href={`https://wa.me/91${selectedDistributor.distributor.phone.replace(/\\D/g, '')}`}
                      className="inline-flex items-center gap-1 text-green-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.52 3.48A11.78 11.78 0 0012.04 0C5.58 0 .23 5.35.23 11.93c0 2.1.55 4.13 1.6 5.93L0 24l6.31-1.64a12 12 0 005.73 1.46h.01c6.46 0 11.72-5.35 11.72-11.93a11.8 11.8 0 00-3.26-8.41zM12.05 21.3h-.01a9.92 9.92 0 01-5.05-1.37l-.36-.21-3.75.97 1-3.65-.24-.37a9.64 9.64 0 01-1.5-5.24c0-5.37 4.33-9.74 9.65-9.74a9.6 9.6 0 016.86 2.86 9.77 9.77 0 012.83 6.93c0 5.37-4.33 9.74-9.64 9.74zm5.46-7.31c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.29-.77.96-.94 1.16-.17.19-.35.22-.65.07-.3-.15-1.28-.47-2.44-1.5-.9-.8-1.5-1.79-1.68-2.09-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.29.3-.48.1-.19.05-.36-.02-.51-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.36-.27.29-1.04 1.02-1.04 2.49 0 1.46 1.07 2.88 1.22 3.08.15.19 2.1 3.32 5.05 4.65.71.31 1.26.5 1.69.64.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.3-.2-.61-.35z" />
                      </svg>
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setSelectedDistributorId(null)}>
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Inventory Items</h4>
              {selectedDistributorItems.length === 0 ? (
                <p className="text-sm text-gray-500">No items in stock for this distributor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Product</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Stock Qty</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Cost/Unit</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDistributorItems.map((item) => (
                        <tr key={item.productId} className="border-b last:border-0">
                          <td className="px-3 py-2 text-gray-900 font-medium">{item.productName}</td>
                          <td className="px-3 py-2 text-gray-600">{item.totalQuantity}</td>
                          <td className="px-3 py-2 text-gray-600">{formatCurrency(item.totalCost / item.totalQuantity || 0)}</td>
                          <td className="px-3 py-2 text-gray-900 font-semibold">{formatCurrency(item.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan="3" className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">Total Inventory Value:</td>
                        <td className="px-3 py-2 text-sm font-semibold text-blue-600">{formatCurrency(selectedDistributor.inventoryValue || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sold Invoices (Reference)</h4>
              <p className="text-xs text-gray-500 mb-2">Shows the cost price total (what you owe) for each invoice, not the selling price.</p>
              {selectedDistributorInvoices.length === 0 ? (
                <p className="text-sm text-gray-500">No invoices created yet for this distributor.</p>
              ) : (
                <div className="space-y-4">
                  {selectedDistributorInvoices.map((invoice) => (
                    <div key={invoice.invoiceId} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-gray-900">{invoice.invoiceNo || invoice.invoiceId}</span>
                            <span className="text-xs text-gray-500 ml-2">{formatInvoiceDate(invoice.date)}</span>
                          </div>
                          <span className="text-sm font-bold text-blue-600">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                      </div>
                      {invoice.items && invoice.items.length > 0 && (
                        <div className="px-3 py-2">
                          <table className="w-full text-xs">
                    <thead>
                              <tr className="text-gray-500 border-b border-gray-200">
                                <th className="px-2 py-1 text-left">Product</th>
                                <th className="px-2 py-1 text-right">Qty</th>
                                <th className="px-2 py-1 text-right">Cost Price</th>
                                <th className="px-2 py-1 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                              {invoice.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                  <td className="px-2 py-1 text-gray-700">{item.productName || 'Product'}</td>
                                  <td className="px-2 py-1 text-right text-gray-600">{item.quantity || item.qty || 0}</td>
                                  <td className="px-2 py-1 text-right text-gray-600">{formatCurrency(item.costPrice || 0)}</td>
                                  <td className="px-2 py-1 text-right font-semibold text-gray-900">{formatCurrency(item.lineCost || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="bg-gray-50 border-t-2 border-gray-300 px-3 py-2 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">Total Cost Price:</span>
                      <span className="text-sm font-bold text-blue-600">
                          {formatCurrency(selectedDistributorInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Settlements</h4>
              <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => openSettlementModal(selectedDistributor.distributor.id)}>
                Add Settlement
              </button>
            </div>
            {selectedDistributorSettlements.length === 0 ? (
              <p className="text-sm text-gray-500">No settlements recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 border rounded-md">
                {selectedDistributorSettlements.map((settlement) => {
                  // Get invoices that are part of this settlement
                  const settlementInvoices = (settlement.invoiceIds || [])
                    .map(invoiceId => selectedDistributorSettledInvoices.find(inv => inv.invoiceId === invoiceId))
                    .filter(Boolean)
                  
                  return (
                    <li key={settlement.id} className="px-3 py-3 text-sm space-y-2 border-b last:border-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-base">{formatCurrency(settlement.amount)}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{formatInvoiceDate(settlement.date)}</span>
                            {settlement.method && (
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                {settlement.method.charAt(0).toUpperCase() + settlement.method.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          className="text-brand-primary hover:underline"
                          onClick={() => openSettlementModal(settlement.distributorId, settlement)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-500 hover:underline"
                          onClick={() =>
                            setConfirmDelete({ isOpen: true, settlementId: settlement.id })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                      
                      {settlementInvoices.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Invoices Covered:</p>
                          <div className="space-y-1">
                            {settlementInvoices.map((invoice) => (
                              <div key={invoice.invoiceId} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1.5 rounded">
                                <div>
                                  <span className="font-medium text-gray-900">{invoice.invoiceNo || invoice.invoiceId}</span>
                                  <span className="text-gray-500 ml-2">{formatInvoiceDate(invoice.date)}</span>
                                </div>
                                <span className="font-semibold text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {settlement.note && (
                        <p className="text-xs text-gray-500 italic pt-1 border-t border-gray-100">
                          {settlement.note}
                        </p>
                      )}
                  </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {showSettlementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                {editingSettlement ? 'Edit Settlement' : 'Record Settlement'}
              </h3>
              {projectedRemaining !== null && (
                <p className="text-xs text-gray-500">
                  Remaining: <span className="font-semibold text-gray-900">{formatCurrency(projectedRemaining)}</span>
                </p>
              )}
            </div>
            <form className="space-y-3" onSubmit={handleSettlementSubmit}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Distributor</label>
                  <select
                    className="w-full text-sm py-1.5"
                    value={settlementForm.distributorId}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, distributorId: e.target.value }))}
                  >
                    <option value="">Select</option>
                    {payables.map(entry => (
                      <option key={entry.distributor.id} value={entry.distributor.id}>
                        {entry.distributor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Amount</label>
                  <input
                    type="number"
                    className="w-full text-sm py-1.5"
                    min="0"
                    step="0.01"
                    value={settlementForm.amount}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Date</label>
                  <input
                    type="date"
                    className="w-full text-sm py-1.5"
                    value={settlementForm.date}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Method</label>
                  <select
                    className="w-full text-sm py-1.5"
                    value={settlementForm.method}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, method: e.target.value }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Note</label>
                <textarea
                  className="w-full text-sm py-1.5"
                  rows="2"
                  value={settlementForm.note}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>

              {settlementInvoiceOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoices Covered</label>
                  <div className="border rounded-md max-h-40 overflow-y-auto divide-y divide-gray-200">
                    {settlementInvoiceOptions.map(option => {
                      const itemNames = option.items?.map(item => item.productName).filter(Boolean).join(', ') || 'N/A'
                      return (
                        <label key={option.invoiceId} className="flex items-start gap-2 px-2.5 py-1.5 text-xs hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 mt-0.5 text-brand-primary flex-shrink-0"
                            checked={settlementForm.invoiceIds.includes(option.invoiceId)}
                            onChange={() => toggleSettlementInvoice(option.invoiceId)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{option.invoiceNo || option.invoiceId}</p>
                              <p className="text-gray-500">{formatInvoiceDate(option.date)}</p>
                            </div>
                            <p className="text-gray-600 mt-0.5 truncate" title={itemNames}>{itemNames}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button type="button" className="btn-secondary text-sm py-1.5 px-3" onClick={() => setShowSettlementModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm py-1.5 px-3">
                  Save Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete settlement?"
        message="This will permanently remove the settlement record from the distributor history."
        confirmLabel="Delete"
        confirmVariant="danger"
        onClose={() => setConfirmDelete({ isOpen: false, settlementId: null })}
        onConfirm={handleDeleteSettlement}
      />

      <ConfirmModal
        isOpen={confirmDeleteDistributor.isOpen}
        title="Delete Distributor?"
        message={`Are you sure you want to delete "${confirmDeleteDistributor.distributorName}"? This will remove the distributor from all products and cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onClose={() => setConfirmDeleteDistributor({ isOpen: false, distributorId: null, distributorName: '' })}
        onConfirm={handleDeleteDistributor}
      />
    </div>
  )
}


