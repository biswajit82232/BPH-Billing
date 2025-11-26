import { useRef, useState } from 'react'
import InvoicePreview from './InvoicePreview'
import { useToast } from './ToastContainer'

export default function PrintInvoice({ invoice, className = '', label = 'Print' }) {
  const [printing, setPrinting] = useState(false)
  const previewRef = useRef(null)
  const toast = useToast()

  const handlePrint = () => {
    if (!invoice) return
    
    setPrinting(true)
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      
      if (!printWindow) {
        toast.error('Please allow popups to print')
        setPrinting(false)
        return
      }

      // Get the invoice preview HTML
      const element = previewRef.current
      if (!element) {
        toast.error('Invoice preview not available')
        setPrinting(false)
        return
      }

      // Get all styles from the current document
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(style => {
          if (style.tagName === 'STYLE') {
            return `<style>${style.innerHTML}</style>`
          } else {
            return `<link rel="stylesheet" href="${style.href}">`
          }
        })
        .join('\n')
      
      // Clone the preview element
      const printContent = element.innerHTML
      
      // Create print-friendly HTML
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoice.invoiceNo}</title>
            <meta charset="utf-8">
            ${styles}
            <style>
              @media print {
                @page {
                  margin: 0.5cm;
                  size: A4;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                .no-print {
                  display: none !important;
                }
                * {
                  page-break-inside: avoid;
                }
                #invoice-${invoice.id} {
                  page-break-after: avoid;
                  page-break-inside: avoid;
                }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                padding: 20px;
                background: white;
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `

      // Write content to print window
      printWindow.document.write(printHTML)
      printWindow.document.close()

      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        
        // Close window after print (or user cancels)
        const checkClosed = setInterval(() => {
          if (printWindow.closed) {
            clearInterval(checkClosed)
            setPrinting(false)
            toast.success('Print dialog opened')
          }
        }, 100)
        
        // Fallback: close after 5 seconds if still open
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close()
            setPrinting(false)
          }
        }, 5000)
      }, 500)
    } catch (error) {
      console.error('Print error:', error)
      toast.error('Failed to open print dialog')
      setPrinting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        className={className || 'btn-secondary'}
        disabled={printing}
        title="Print Invoice"
      >
        {printing ? 'Preparing...' : label}
      </button>
      <div className="hidden">
        <div ref={previewRef}>
          <InvoicePreview invoice={invoice} />
        </div>
      </div>
    </>
  )
}

