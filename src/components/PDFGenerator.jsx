import { useRef } from 'react'
import html2pdf from 'html2pdf.js'
import InvoicePreview from './InvoicePreview'

export default function PDFGenerator({ invoice, label = 'Download PDF', className = '' }) {
  const previewRef = useRef(null)

  const handleDownload = () => {
    if (!invoice) return
    const element = previewRef.current
    if (!element) return

    html2pdf()
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
      .save()
  }

  return (
    <>
      <button type="button" className={className || 'btn-primary'} onClick={handleDownload}>
        {label}
      </button>
      <div className="hidden">
        <div ref={previewRef}>
          <InvoicePreview invoice={invoice} />
        </div>
      </div>
    </>
  )
}

