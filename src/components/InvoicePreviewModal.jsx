import { useMemo } from 'react'
import InvoicePreview from './InvoicePreview'
import PDFGenerator from './PDFGenerator'
import WhatsAppShare from './WhatsAppShare'
import PrintInvoice from './PrintInvoice'
import { useData } from '../context/DataContext'

export default function InvoicePreviewModal({ invoice, isOpen, onClose }) {
  const { customers } = useData()

  // Find customer data if needed
  const invoiceWithCustomer = useMemo(() => {
    if (!invoice) return null
    const customer = customers.find(c => c.id === invoice.customerId) || null
    return customer ? { ...invoice, customer } : invoice
  }, [invoice, customers])

  if (!isOpen || !invoice) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Invoice Preview - {invoice.invoiceNo || 'Draft'}
            </h2>
            <p className="text-xs text-gray-500">
              {invoice.customerName || 'Customer'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <PDFGenerator 
              invoice={invoiceWithCustomer} 
              label="PDF" 
              className="!text-xs !px-3 !py-1.5" 
            />
            {invoice.phone && (
              <WhatsAppShare 
                invoice={invoiceWithCustomer} 
                className="!text-xs !px-3 !py-1.5 !btn-success" 
                showHint={false}
              />
            )}
            <PrintInvoice 
              invoice={invoiceWithCustomer} 
              label="Print" 
              className="!text-xs !px-3 !py-1.5" 
            />
            <button
              onClick={onClose}
              className="btn-secondary text-xs px-3 py-1.5"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4">
          <InvoicePreview invoice={invoiceWithCustomer} />
        </div>
      </div>
    </div>
  )
}

