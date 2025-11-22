import { useRef, useState } from 'react'
import html2pdf from 'html2pdf.js'
import InvoicePreview from './InvoicePreview'
import { BRAND } from '../data/branding'
import { useToast } from './ToastContainer'
import { formatPhoneForWhatsApp, formatPhoneForDisplay } from '../utils/phoneUtils'

export default function WhatsAppShare({ invoice, className = '', showHint = true, label = 'Share via WhatsApp' }) {
  const [sharing, setSharing] = useState(false)
  const previewRef = useRef(null)
  const toast = useToast()

  const buildPdfBlob = async () => {
    const element = previewRef.current
    if (!element) throw new Error('Invoice preview missing')

    const worker = html2pdf()
      .set({
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `BPH-INVOICE-${invoice.invoiceNo}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { 
          unit: 'in', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['tr', '.no-break']
        }
      })
      .from(element)

    return worker.outputPdf('blob')
  }

  const handleShare = async () => {
    if (!invoice) return
    setSharing(true)
    try {
      const blob = await buildPdfBlob()
      const file = new File([blob], `BPH-INVOICE-${invoice.invoiceNo}.pdf`, {
        type: 'application/pdf',
      })

      const firstItem = invoice.items?.[0]
      const baseItemName = firstItem?.name || firstItem?.description || 'your order'
      const additionalCount = invoice.items?.length > 1 ? ` +${invoice.items.length - 1} more` : ''
      const itemLine = `Item: ${baseItemName}${additionalCount}`

      const message =
        `Hi ${invoice.customerName},\n\n` +
        `Invoice ${invoice.invoiceNo}\n` +
        `Amount: ₹${invoice.totals.grandTotal}\n` +
        `${itemLine}\n\n` +
        `Thank you for your business!\n- ${BRAND.name}`

      // Format phone number for WhatsApp
      const rawPhone = invoice.phone || ''
      const formattedPhone = formatPhoneForWhatsApp(rawPhone)

      // Always download the PDF so it can be attached manually if needed
      const url = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = url
      downloadLink.download = file.name
      downloadLink.click()
      
      const fallbackText = encodeURIComponent(message)
      
      // Open WhatsApp chat with customer number
      if (formattedPhone && formattedPhone.length >= 10) {
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${fallbackText}`
        window.open(whatsappUrl, '_blank')
        // Also try wa.me as secondary in case api URL is blocked
        setTimeout(() => window.open(`https://wa.me/${formattedPhone}?text=${fallbackText}`, '_blank'), 500)
        toast.success(`WhatsApp opened for ${invoice.customerName}`)
      } else {
        const displayPhone = invoice.phone || 'Not provided'
        toast.error(`Invalid phone number: ${displayPhone}`)
        alert(
          `❌ Cannot open WhatsApp\n\n` +
          `Customer: ${invoice.customerName}\n` +
          `Phone: ${displayPhone}\n\n` +
          `Please add a valid 10-digit phone number.\n` +
          `Example: 9635505436`
        )
      }
    } catch (error) {
      console.error('Unable to share on WhatsApp', error)
      toast.error('Failed to generate PDF for WhatsApp')
      alert('Failed to share on WhatsApp. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        className={className || 'btn-primary bg-green-600 hover:bg-green-700'}
        disabled={sharing}
      >
        {sharing ? 'Preparing...' : label}
      </button>
      {showHint && (
        <div className="mt-2 space-y-1">
          {invoice?.phone ? (
            <p className="text-xs font-medium text-green-600">
              📱 WhatsApp: {formatPhoneForDisplay(invoice.phone)}
            </p>
          ) : (
            <p className="text-xs font-medium text-red-600">
              ⚠️ Customer phone number missing
            </p>
          )}
        </div>
      )}
      <div className="hidden">
        <div ref={previewRef}>
          <InvoicePreview invoice={invoice} />
        </div>
      </div>
    </div>
  )
}

