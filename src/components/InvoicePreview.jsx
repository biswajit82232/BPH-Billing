import { memo } from 'react'
import { BRAND } from '../data/branding'
import { amountToWords, formatCurrency, formatInvoiceDate } from '../lib/taxUtils'
import { useData } from '../context/DataContext'

function InvoicePreview({ invoice }) {
  const { products, settings } = useData()
  if (!invoice) return null
  
  const invoiceStyle = settings.invoiceStyle || 'style1'
  
  // Helper to get product name from productId
  const getProductName = (productId) => {
    if (!productId) return ''
    const product = products.find((p) => p.id === productId)
    return product ? product.name : ''
  }

  // Handle both nested and flattened customer data structures
  const customerName = invoice.customerName || invoice.customer?.name || 'Customer Name'
  const customerEmail = invoice.email || invoice.customer?.email || ''
  const customerPhone = invoice.phone || invoice.customer?.phone || ''
  const customerAddress = invoice.address || invoice.customer?.address || ''
  const customerGstin = invoice.gstin || invoice.customer?.gstin || ''
  const customerAadhaar = invoice.aadhaar || invoice.customer?.aadhaar || ''
  const customerDob = invoice.dob || invoice.customer?.dob || ''
  const placeOfSupply = invoice.place_of_supply || invoice.customer?.state || 'N/A'

  // Style-specific classes
  const styleClasses = {
    style1: {
      container: 'bg-white text-gray-900 p-6 border border-gray-200 rounded-lg',
      header: 'flex flex-col md:flex-row justify-between items-start gap-3 border-b border-gray-300 pb-4 mb-4',
      headerTitle: 'text-xl md:text-2xl font-semibold text-gray-900',
      headerText: 'text-xs md:text-sm text-gray-600',
    },
    style2: {
      container: 'bg-white text-gray-900 p-8 border-2 border-blue-200 rounded-lg shadow-sm',
      header: 'flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-blue-300 pb-5 mb-5',
      headerTitle: 'text-2xl md:text-3xl font-bold text-blue-900',
      headerText: 'text-sm md:text-base text-gray-700',
    },
    style3: {
      container: 'bg-white text-gray-900 p-4 border border-gray-300 rounded',
      header: 'flex flex-col md:flex-row justify-between items-start gap-2 border-b border-gray-400 pb-2 mb-3',
      headerTitle: 'text-lg md:text-xl font-semibold text-gray-900',
      headerText: 'text-xs text-gray-600',
    },
    style4: {
      container: 'bg-white text-gray-900 p-6 border-l-4 border-gray-800 rounded',
      header: 'flex flex-col md:flex-row justify-between items-start gap-3 border-b-2 border-gray-800 pb-4 mb-4',
      headerTitle: 'text-xl md:text-2xl font-bold text-gray-900 uppercase tracking-wide',
      headerText: 'text-xs md:text-sm text-gray-700 font-medium',
    },
    style5: {
      container: 'bg-white text-gray-900 p-5 border-0',
      header: 'flex flex-col md:flex-row justify-between items-start gap-3 border-b border-gray-200 pb-3 mb-3',
      headerTitle: 'text-xl font-light text-gray-900',
      headerText: 'text-xs text-gray-500',
    },
  }
  
  const currentStyle = styleClasses[invoiceStyle] || styleClasses.style1
  const discountAmount = Math.max(0, invoice.discountAmount ?? invoice.totals?.discount ?? 0)
  const grandTotal = invoice.totals?.grandTotal || 0
  const amountPaid = Number(invoice.amountPaid) || 0
  const outstanding = Math.max(0, grandTotal - amountPaid)

  return (
    <div
      className={currentStyle.container}
      id={`invoice-${invoice.id}`}
      style={{ 
        maxWidth: '210mm', 
        margin: '0 auto',
        pageBreakInside: 'avoid',
        pageBreakAfter: 'auto'
      }}
    >
      {/* Header */}
      <div className={currentStyle.header} style={{ pageBreakInside: 'avoid' }}>
        <div className="space-y-1">
          <h2 className={currentStyle.headerTitle}>{settings?.companyName || BRAND.name}</h2>
          {(settings?.companyTagline || BRAND.tagline) && (
            <p className={currentStyle.headerText}>{settings?.companyTagline || BRAND.tagline}</p>
          )}
          {(settings?.companyAddress || BRAND.address) && (
            <p className={currentStyle.headerText}>{settings?.companyAddress || BRAND.address}</p>
          )}
          {(invoice?.companyGstin || settings?.companyGstin || BRAND.gstin) && (
            <p className={currentStyle.headerText}>GSTIN: {invoice?.companyGstin || settings?.companyGstin || BRAND.gstin}</p>
          )}
          {(settings?.companyMobile || BRAND.contact) && (
            <p className={currentStyle.headerText}>Mobile: {settings?.companyMobile || (Array.isArray(BRAND.contact) ? BRAND.contact.join(' / ') : BRAND.contact)}</p>
          )}
          {(settings?.companyEmail || BRAND.email) && (
            <p className={currentStyle.headerText}>Email: {settings?.companyEmail || BRAND.email}</p>
          )}
        </div>
        <div className="text-left md:text-right space-y-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Invoice</p>
            <p className="text-lg md:text-xl font-semibold text-gray-900">{invoice.invoiceNo}</p>
          </div>
          <div className="text-xs md:text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Invoice Date:</span> {formatInvoiceDate(invoice.date)}</p>
            {invoice.terms && <p><span className="font-medium">Terms:</span> {invoice.terms}</p>}
            {invoice.dueDate && <p><span className="font-medium">Due Date:</span> {formatInvoiceDate(invoice.dueDate)}</p>}
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-4" style={{ pageBreakInside: 'avoid' }}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bill To</p>
        <div className="space-y-1.5">
          <p className="text-sm md:text-base font-semibold text-gray-900">{customerName}</p>
          {customerAddress && (
            <p className="text-xs md:text-sm text-gray-600">
              <span className="font-medium">Address:</span> {customerAddress}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {customerEmail && (
              <p className="text-xs md:text-sm text-gray-600">
                <span className="font-medium">Email:</span> {customerEmail}
              </p>
            )}
            {customerPhone && (
              <p className="text-xs md:text-sm text-gray-600">
                <span className="font-medium">Phone:</span> {customerPhone}
              </p>
            )}
            {customerDob && (
              <p className="text-xs md:text-sm text-gray-600">
                <span className="font-medium">DOB:</span> {customerDob ? formatInvoiceDate(customerDob) : 'N/A'}
              </p>
            )}
            {customerAadhaar && (
              <p className="text-xs md:text-sm text-gray-600">
                <span className="font-medium">Aadhaar:</span> {customerAadhaar}
              </p>
            )}
            <p className="text-xs md:text-sm text-gray-600">
              <span className="font-medium">Place of Supply:</span> {placeOfSupply}
            </p>
            {customerGstin && (
              <p className="text-xs md:text-sm text-gray-600">
                <span className="font-medium">GSTIN:</span> {customerGstin}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[350px] sm:min-w-[600px]" style={{ pageBreakInside: 'auto' }}>
          <thead style={{ pageBreakInside: 'avoid', pageBreakAfter: 'avoid' }}>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3">Product</th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3 hidden sm:table-cell">Description</th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3 hidden md:table-cell">HSN</th>
              <th className="text-center text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3">Qty</th>
              <th className="text-right text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3">Rate</th>
              <th className="text-right text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3 hidden sm:table-cell">Taxable</th>
              <th className="text-center text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3 hidden md:table-cell">Tax %</th>
              <th className="text-right text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3">Tax</th>
              <th className="text-right text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wide px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const productName = item.productName || getProductName(item.productId)
              const descriptionText = item.description || ''
              return (
                <tr key={idx} className="border-b border-gray-100" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'auto' }}>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-gray-600 font-medium">
                    {productName || 'Manual Entry'}
                    {descriptionText && (
                      <span className="sm:hidden block text-[9px] text-gray-500 mt-0.5 whitespace-pre-line break-words">
                        {descriptionText}
                      </span>
                    )}
                  </td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-gray-900 hidden sm:table-cell whitespace-pre-line break-words">
                    {descriptionText || '-'}
                  </td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-gray-600 hidden md:table-cell">{item.hsn || '-'}</td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-center text-gray-900">{item.qty}</td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-right text-gray-900">{formatCurrency(item.rate)}</td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-right text-gray-900 hidden sm:table-cell">{formatCurrency(item.taxable)}</td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-center text-gray-600 hidden md:table-cell">{item.taxPercent}%</td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-right text-gray-900">{formatCurrency(item.tax)}</td>
                  <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-4" style={{ pageBreakInside: 'avoid' }}>
        <div className="w-full md:w-80 space-y-1 md:space-y-2">
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.taxable)}</span>
          </div>
          {invoice.totals.cgst > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-600">CGST</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.cgst)}</span>
            </div>
          )}
          {invoice.totals.sgst > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-600">SGST</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.sgst)}</span>
            </div>
          )}
          {invoice.totals.igst > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-600">IGST</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.igst)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm py-1 text-rose-600">
              <span className="text-gray-600">Discount</span>
              <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t-2 border-gray-300 mt-2">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-xl font-semibold text-gray-900">{formatCurrency(grandTotal)}</span>
          </div>
          {amountPaid > 0 && (
            <>
              <div className="flex justify-between text-sm py-1 text-green-700">
                <span className="font-medium">Amount Paid</span>
                <span className="font-medium">{formatCurrency(amountPaid)}</span>
              </div>
              {outstanding > 0 && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-base font-semibold text-red-700">Outstanding</span>
                  <span className="text-xl font-semibold text-red-700">{formatCurrency(outstanding)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Amount in Words */}
      <div className="pt-3 border-t border-gray-200 mb-3" style={{ pageBreakInside: 'avoid' }}>
        <p className="text-xs md:text-sm text-gray-600">
          <span className="font-medium">Amount in words:</span> {amountToWords(invoice.totals.grandTotal)}
        </p>
      </div>

      {/* Customer Notes */}
      {invoice.notes && invoice.notes.trim() && (
        <div className="pt-3 border-t border-gray-200 mb-3" style={{ pageBreakInside: 'avoid' }}>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</p>
          <p className="text-xs md:text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}

      {/* Reverse Charge Indicator */}
      {invoice.reverseCharge && (
        <div className="pt-3 border-t border-gray-200 mb-3" style={{ pageBreakInside: 'avoid' }}>
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
            ⚠️ Reverse Charge Applicable
          </p>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="pt-3 border-t border-gray-200 mb-3" style={{ pageBreakInside: 'avoid' }}>
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Terms & Conditions</p>
        <div className="text-xs md:text-sm text-gray-600 space-y-1">
          <p>• Manufacturer warranty only. No warranty for damage or misuse.</p>
          <p>• Invoice required for claims.</p>
          <p>• No return after sale.</p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="pt-3 border-t border-gray-200" style={{ pageBreakInside: 'avoid' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 w-full text-center">Receiver's Signature</p>
            {invoice.customerSignature ? (
              <div className="signature-container" style={{ minHeight: '120px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <img 
                  src={invoice.customerSignature} 
                  alt="Customer Signature" 
                  className="signature-rotated"
                  style={{ maxWidth: '150px', maxHeight: '80px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="border-b-2 border-gray-300 pt-8 w-full mb-2"></div>
            )}
            <p className="text-xs text-gray-500 mt-1 text-center w-full">{customerName}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 w-full text-center">Authorized Signatory</p>
            {settings.companySignature ? (
              <div className="signature-container" style={{ minHeight: '120px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <img 
                  src={settings.companySignature} 
                  alt="Company Signature" 
                  className="signature-rotated"
                  style={{ maxWidth: '150px', maxHeight: '80px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full mb-2" style={{ minHeight: '80px' }}>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-800" style={{ fontFamily: 'cursive', letterSpacing: '1px' }}>{BRAND.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Authorized Signature</p>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1 text-center w-full">{BRAND.name}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(InvoicePreview)

