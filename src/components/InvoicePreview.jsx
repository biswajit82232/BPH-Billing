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
      className={`${currentStyle.container} no-break`}
      id={`invoice-${invoice.id}`}
      style={{ 
        maxWidth: '210mm', 
        margin: '0 auto',
        pageBreakInside: 'avoid',
        pageBreakAfter: 'avoid',
        padding: '10px'
      }}
    >
      {/* Header */}
      <div className={currentStyle.header} style={{ pageBreakInside: 'avoid', paddingBottom: '8px', marginBottom: '8px' }}>
        <div className="space-y-1">
          <h2 className={currentStyle.headerTitle} style={{ fontSize: '16px', lineHeight: '1.3' }}>{settings?.companyName || BRAND.name}</h2>
          {(settings?.companyTagline || BRAND.tagline) && (
            <p className={currentStyle.headerText} style={{ fontSize: '11px', lineHeight: '1.3' }}>{settings?.companyTagline || BRAND.tagline}</p>
          )}
          {(settings?.companyAddress || BRAND.address) && (
            <p className={currentStyle.headerText} style={{ fontSize: '10px', lineHeight: '1.3' }}>{settings?.companyAddress || BRAND.address}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5" style={{ fontSize: '10px', lineHeight: '1.3' }}>
            {(invoice?.companyGstin || settings?.companyGstin || BRAND.gstin) && (
              <span className={currentStyle.headerText}>GSTIN: {invoice?.companyGstin || settings?.companyGstin || BRAND.gstin}</span>
            )}
            {(settings?.companyMobile || BRAND.contact) && (
              <span className={currentStyle.headerText}>Mobile: {settings?.companyMobile || (Array.isArray(BRAND.contact) ? BRAND.contact.join(' / ') : BRAND.contact)}</span>
            )}
            {(settings?.companyEmail || BRAND.email) && (
              <span className={currentStyle.headerText}>Email: {settings?.companyEmail || BRAND.email}</span>
            )}
          </div>
        </div>
        <div className="text-right" style={{ minWidth: '160px' }}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">INVOICE</p>
          <p className="text-base font-bold text-gray-900 mb-2">{invoice.invoiceNo}</p>
          <div className="text-[10px] text-gray-600 leading-tight space-y-0.5">
            <p><span className="font-semibold">Invoice Date:</span> {formatInvoiceDate(invoice.date)}</p>
            {invoice.terms && <p><span className="font-semibold">Terms:</span> {invoice.terms}</p>}
            {invoice.dueDate && <p><span className="font-semibold">Due Date:</span> {formatInvoiceDate(invoice.dueDate)}</p>}
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-2" style={{ pageBreakInside: 'avoid' }}>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bill To</p>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">{customerName}</p>
          {customerAddress && (
            <p className="text-[10px] text-gray-600 leading-tight">
              <span className="font-medium">Address:</span> {customerAddress}
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5" style={{ fontSize: '10px', lineHeight: '1.3' }}>
            {customerEmail && (
              <p className="text-gray-600">
                <span className="font-medium">Email:</span> {customerEmail}
              </p>
            )}
            {customerPhone && (
              <p className="text-gray-600">
                <span className="font-medium">Phone:</span> {customerPhone}
              </p>
            )}
            {customerDob && (
              <p className="text-gray-600">
                <span className="font-medium">DOB:</span> {formatInvoiceDate(customerDob)}
              </p>
            )}
            {customerAadhaar && (
              <p className="text-gray-600">
                <span className="font-medium">Aadhaar:</span> {customerAadhaar}
              </p>
            )}
            <p className="text-gray-600">
              <span className="font-medium">Place of Supply:</span> {placeOfSupply}
            </p>
            {customerGstin && (
              <p className="text-gray-600">
                <span className="font-medium">GSTIN:</span> {customerGstin}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[350px] sm:min-w-[600px]" style={{ pageBreakInside: 'auto' }}>
          <thead style={{ pageBreakInside: 'avoid', pageBreakAfter: 'avoid' }}>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5">Product</th>
              <th className="text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5 hidden sm:table-cell">Description</th>
              <th className="text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5 hidden md:table-cell">HSN</th>
              <th className="text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5">Qty</th>
              <th className="text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5">Rate</th>
              <th className="text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5 hidden sm:table-cell">Taxable</th>
              <th className="text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5 hidden md:table-cell">Tax %</th>
              <th className="text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5">Tax</th>
              <th className="text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide px-2 py-1.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const productName = item.productName || getProductName(item.productId)
              const descriptionText = item.description || ''
              return (
                <tr key={idx} className="border-b border-gray-100" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'auto' }}>
                  <td className="px-2 py-1 text-[10px] text-gray-600 font-medium leading-tight">
                    {productName || 'Manual Entry'}
                    {descriptionText && (
                      <span className="sm:hidden block text-[9px] text-gray-500 mt-0.5 whitespace-pre-line break-words">
                        {descriptionText}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-[10px] text-gray-900 hidden sm:table-cell whitespace-pre-line break-words leading-tight">
                    {descriptionText || '-'}
                  </td>
                  <td className="px-2 py-1 text-[10px] text-gray-600 hidden md:table-cell leading-tight">{item.hsn || '-'}</td>
                  <td className="px-2 py-1 text-[10px] text-center text-gray-900 leading-tight">{item.qty}</td>
                  <td className="px-2 py-1 text-[10px] text-right text-gray-900 leading-tight">{formatCurrency(item.rate)}</td>
                  <td className="px-2 py-1 text-[10px] text-right text-gray-900 hidden sm:table-cell leading-tight">{formatCurrency(item.taxable)}</td>
                  <td className="px-2 py-1 text-[10px] text-center text-gray-600 hidden md:table-cell leading-tight">{item.taxPercent}%</td>
                  <td className="px-2 py-1 text-[10px] text-right text-gray-900 leading-tight">{formatCurrency(item.tax)}</td>
                  <td className="px-2 py-1 text-[10px] text-right font-medium text-gray-900 leading-tight">{formatCurrency(item.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-2" style={{ pageBreakInside: 'avoid' }}>
        <div className="w-full md:w-80 space-y-1">
          <div className="flex justify-between text-[10px] py-0.5 leading-tight">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.taxable)}</span>
          </div>
          {invoice.totals.cgst > 0 && (
            <div className="flex justify-between text-[10px] py-0.5 leading-tight">
              <span className="text-gray-600">CGST</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.cgst)}</span>
            </div>
          )}
          {invoice.totals.sgst > 0 && (
            <div className="flex justify-between text-[10px] py-0.5 leading-tight">
              <span className="text-gray-600">SGST</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.sgst)}</span>
            </div>
          )}
          {invoice.totals.igst > 0 && (
            <div className="flex justify-between text-[10px] py-0.5 leading-tight">
              <span className="text-gray-600">IGST</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.totals.igst)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-[10px] py-0.5 text-rose-600 leading-tight">
              <span className="text-gray-600">Discount</span>
              <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 border-t border-gray-300 mt-1">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-base font-semibold text-gray-900">{formatCurrency(grandTotal)}</span>
          </div>
          {amountPaid > 0 && (
            <>
              {invoice.paymentMethods && Array.isArray(invoice.paymentMethods) && invoice.paymentMethods.length > 0 ? (
                <div className="pt-1.5 border-t border-gray-200 space-y-0.5 mt-1">
                  <div className="text-[10px] font-semibold text-gray-700 mb-0.5">Payment Methods:</div>
                  {invoice.paymentMethods.map((pm, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] text-gray-600 leading-tight">
                      <span>
                        {pm.method}
                        {pm.method === 'Finance Company' && pm.companyName && ` (${pm.companyName})`}
                        {pm.reference && ` - ${pm.reference}`}
                      </span>
                      <span className="font-medium">{formatCurrency(Number(pm.amount) || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[10px] pt-1 border-t border-gray-200 mt-0.5 text-green-700 leading-tight">
                    <span className="font-medium">Total Paid</span>
                    <span className="font-medium">{formatCurrency(amountPaid)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-[10px] py-0.5 text-green-700 leading-tight">
                  <span className="font-medium">Amount Paid</span>
                  <span className="font-medium">{formatCurrency(amountPaid)}</span>
                </div>
              )}
              {outstanding > 0 && (
                <div className="flex justify-between pt-1.5 border-t border-gray-200 mt-1">
                  <span className="text-xs font-semibold text-red-700">Outstanding</span>
                  <span className="text-sm font-semibold text-red-700">{formatCurrency(outstanding)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Amount in Words */}
      <div className="pt-1.5 border-t border-gray-200 mb-1.5" style={{ pageBreakInside: 'avoid' }}>
        <p className="text-[10px] text-gray-600 leading-tight">
          <span className="font-medium">Amount in words:</span> {amountToWords(invoice.totals.grandTotal)}
        </p>
      </div>

      {/* Customer Notes */}
      {invoice.notes && invoice.notes.trim() && (
        <div className="pt-1.5 border-t border-gray-200 mb-1.5" style={{ pageBreakInside: 'avoid' }}>
          <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-[10px] text-gray-600 whitespace-pre-line leading-tight">{invoice.notes}</p>
        </div>
      )}

      {/* Reverse Charge Indicator */}
      {invoice.reverseCharge && (
        <div className="pt-1.5 border-t border-gray-200 mb-1.5" style={{ pageBreakInside: 'avoid' }}>
          <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wide leading-tight">
            ⚠️ Reverse Charge Applicable
          </p>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="pt-1.5 border-t border-gray-200 mb-1.5" style={{ pageBreakInside: 'avoid' }}>
        <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Terms & Conditions</p>
        <div className="text-[10px] text-gray-600 space-y-0.5 leading-tight">
          <p>• Manufacturer warranty only. No warranty for damage or misuse.</p>
          <p>• Invoice required for claims.</p>
          <p>• No return after sale.</p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="pt-2 border-t border-gray-200" style={{ pageBreakInside: 'avoid', marginTop: '8px' }}>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-1 w-full text-center">Receiver's Signature</p>
            {invoice.customerSignature ? (
              <div className="signature-container" style={{ minHeight: '60px', minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                <img 
                  src={invoice.customerSignature} 
                  alt="Customer Signature" 
                  className="signature-rotated"
                  style={{ maxWidth: '120px', maxHeight: '60px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="border-b-2 border-gray-300 pt-6 w-full mb-1" style={{ minHeight: '60px' }}></div>
            )}
            <p className="text-[9px] text-gray-500 mt-0.5 text-center w-full">{customerName}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-1 w-full text-center">Authorized Signatory</p>
            {settings.companySignature ? (
              <div className="signature-container" style={{ minHeight: '60px', minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                <img 
                  src={settings.companySignature} 
                  alt="Company Signature" 
                  className="signature-rotated"
                  style={{ maxWidth: '120px', maxHeight: '60px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full mb-1" style={{ minHeight: '60px' }}>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'cursive', letterSpacing: '1px' }}>{BRAND.name}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Authorized Signature</p>
                </div>
              </div>
            )}
            <p className="text-[9px] text-gray-500 mt-0.5 text-center w-full">{BRAND.name}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(InvoicePreview)

