import { useMemo, useRef, useState } from 'react'
import html2pdf from 'html2pdf.js'
import { format } from 'date-fns'
import { useData } from '../context/DataContext'
import PageHeader from '../components/PageHeader'
import { formatCurrency } from '../lib/taxUtils'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

const gstr1Header = [
  'Type',
  'GSTIN/UIN of recipient',
  'Receiver Name',
  'Invoice Number',
  'Invoice Date',
  'Invoice Value',
  'Place Of Supply',
  'Reverse Charge',
  'Invoice Type',
  'Rate',
  'Taxable Value',
  'Cess Amount',
  'HSN/SAC',
]

export default function GSTReport() {
  const { invoices, purchases, products, refreshData } = useData()
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'))
  const summaryRef = useRef(null)
  
  const pullToRefresh = usePullToRefresh({ onRefresh: refreshData })


  const filtered = useMemo(
    () => invoices.filter(
      (invoice) => 
        invoice.date?.startsWith(period) && 
        invoice.status !== 'draft' // Exclude draft invoices from GST reports
    ),
    [invoices, period],
  )

  const summary = filtered.reduce(
    (acc, invoice) => {
      acc.taxable += invoice.totals?.taxable || 0
      acc.cgst += invoice.totals?.cgst || 0
      acc.sgst += invoice.totals?.sgst || 0
      acc.igst += invoice.totals?.igst || 0
      // Calculate intra-state vs inter-state taxable
      if (invoice.totals?.cgst > 0 || invoice.totals?.sgst > 0) {
        acc.intraStateTaxable += invoice.totals?.taxable || 0
      } else if (invoice.totals?.igst > 0) {
        acc.interStateTaxable += invoice.totals?.taxable || 0
      }
      return acc
    },
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, intraStateTaxable: 0, interStateTaxable: 0 },
  )
  summary.totalTax = summary.cgst + summary.sgst + summary.igst

  const hsnSummary = filtered.reduce((acc, invoice) => {
    invoice.items?.forEach((item) => {
      const key = item.hsn || 'NA'
      if (!acc[key]) {
        acc[key] = { hsn: key, qty: 0, taxable: 0, tax: 0 }
      }
      acc[key].qty += Number(item.qty) || 0
      acc[key].taxable += Number(item.taxable) || 0
      acc[key].tax += Number(item.tax) || 0
    })
    return acc
  }, {})

  const filteredPurchases = useMemo(
    () => purchases.filter((purchase) => purchase.date?.startsWith(period)),
    [purchases, period],
  )

  const purchaseSummary = filteredPurchases.reduce(
    (acc, purchase) => {
      acc.taxable += purchase.totals?.taxable || 0
      acc.tax += purchase.totals?.tax || 0
      acc.total += purchase.totals?.grandTotal || 0
      return acc
    },
    { taxable: 0, tax: 0, total: 0 },
  )

  const downloadCsv = (type) => {
    let rows = []
    if (type === 'gstr1') {
      rows = [gstr1Header]
      if (filtered.length === 0) {
        // Add a message row if no data
        rows.push(['No invoices found for this period', '', '', '', '', '', '', '', '', '', '', ''])
      } else {
      filtered.forEach((invoice) => {
          if (!invoice.items || invoice.items.length === 0) {
            // If invoice has no items, still add invoice row
            rows.push([
              invoice.gstin ? 'B2B' : 'B2C',
              invoice.gstin || '',
              invoice.customerName || '',
              invoice.invoiceNo || '',
              invoice.date || '',
              invoice.totals?.grandTotal || 0,
              invoice.place_of_supply || invoice.state || '',
              invoice.reverseCharge ? 'Y' : 'N',
              invoice.status?.toUpperCase() || 'SENT',
              0,
              invoice.totals?.taxable || 0,
              0,
              '',
            ])
          } else {
        invoice.items.forEach((item) => {
          rows.push([
                invoice.gstin ? 'B2B' : 'B2C', // B2B if customer has GSTIN, else B2C
            invoice.gstin || '',
                invoice.customerName || '',
                invoice.invoiceNo || '',
                invoice.date || '',
            invoice.totals?.grandTotal || 0,
                invoice.place_of_supply || invoice.state || '',
            invoice.reverseCharge ? 'Y' : 'N',
                invoice.status?.toUpperCase() || 'SENT',
                item.taxPercent || 0,
                item.taxable || 0,
                0, // Cess amount
            item.hsn || '',
              ])
            })
          }
        })
      }
    } else if (type === 'purchases') {
      rows = [
        ['Date', 'Supplier', 'Bill No', 'Item', 'HSN', 'Qty', 'Rate', 'Taxable', 'Tax %', 'Tax Amount', 'Total'],
      ]
      if (filteredPurchases.length === 0) {
        rows.push(['No purchases found for this period', '', '', '', '', '', '', '', '', '', ''])
      } else {
        filteredPurchases.forEach((purchase) => {
          if (!purchase.items || purchase.items.length === 0) {
            // Add purchase row even if no items
            rows.push([
              purchase.date || '',
              purchase.supplier || '',
              purchase.billNo || '',
              'No items',
              'NA',
              0,
              0,
              0,
              0,
              0,
              purchase.totals?.grandTotal || 0,
            ])
            return
          }
          purchase.items.forEach((item) => {
          // Try to get HSN from product if not in purchase item
          let hsn = item.hsn
          if (!hsn && item.productId) {
            const product = products.find(p => p.id === item.productId)
            hsn = product?.hsn || 'NA'
          }
          const qty = Number(item.qty) || 0
          const rate = Number(item.rate) || 0
          const taxPercent = Number(item.taxPercent) || 0
          const taxable = qty * rate
          const taxAmount = (taxable * taxPercent) / 100
          
          rows.push([
            purchase.date || '',
            purchase.supplier || '',
            purchase.billNo || '',
            item.description || '',
            hsn || 'NA',
            qty,
            rate,
            taxable,
            taxPercent,
            taxAmount,
            purchase.totals?.grandTotal || 0,
          ])
        })
      })
      }
    } else {
      // GSTR-3B format
      rows = [
        ['Period', 'Intra-state Taxable', 'Inter-state Taxable', 'CGST', 'SGST', 'IGST', 'Adjustments', 'Total Payable'],
      ]
      rows.push([
        period,
        summary.intraStateTaxable || 0,
        summary.interStateTaxable || 0,
        summary.cgst,
        summary.sgst,
        summary.igst,
        0, // Adjustments (if any)
        summary.totalTax,
      ])
    }
    const csvContent = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${type}-${period}.csv`
    link.click()
  }

  const downloadPdf = (type = 'summary') => {
    if (type === 'summary') {
    if (!summaryRef.current) return
    html2pdf()
      .set({
        margin: 0.5,
        filename: `GST-SUMMARY-${period}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4' },
      })
      .from(summaryRef.current)
      .save()
      return
    }

    // Create PDF for GSTR-1, GSTR-3B, or Purchases
    const createPdfContent = () => {
      const formatNumber = (num) => {
        return new Intl.NumberFormat('en-IN', { 
          style: 'currency', 
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num || 0)
      }
      
      const isLandscape = type === 'gstr1' || type === 'purchases'
      let content = `
        <div style="font-family: 'Arial', 'Helvetica', sans-serif; padding: 15px; width: 100%; max-width: 100%; box-sizing: border-box; background-color: white; color: black; overflow: visible;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">
            <h1 style="color: #1e40af; margin: 0; font-size: ${isLandscape ? '24px' : '22px'}; font-weight: bold; display: block;">GST Report</h1>
            <p style="color: #666; margin: 5px 0; font-size: ${isLandscape ? '14px' : '13px'}; font-weight: 500; display: block;">Period: ${period}</p>
            <p style="color: #666; margin: 0; font-size: 11px; display: block;">Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
          </div>
      `

      if (type === 'gstr1') {
        if (filtered.length === 0) {
          content += `
            <div style="text-align: center; padding: 40px; color: #666;">
              <p style="font-size: 16px;">No invoices found for period ${period}</p>
            </div>
          `
        } else {
          content += `
          <h2 style="color: #333; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-top: 15px; font-size: 18px; display: block;">GSTR-1 - Sales Invoice Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 7px; page-break-inside: avoid; display: table; table-layout: fixed;">
            <colgroup>
              <col style="width: 10%;">
              <col style="width: 8%;">
              <col style="width: 18%;">
              <col style="width: 12%;">
              <col style="width: 10%;">
              <col style="width: 10%;">
              <col style="width: 10%;">
              <col style="width: 10%;">
              <col style="width: 12%;">
            </colgroup>
            <thead style="display: table-header-group; page-break-after: avoid;">
              <tr style="background-color: #f3f4f6; page-break-inside: avoid;">
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">Invoice No</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">Date</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">Customer</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">GSTIN</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">Taxable</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">CGST</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">SGST</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">IGST</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">Total</th>
              </tr>
            </thead>
            <tbody style="display: table-row-group;">
        `
          filtered.forEach((invoice, idx) => {
            // Add page break every 20 rows to prevent cutoffs
            const shouldBreak = idx > 0 && idx % 20 === 0
            content += `
            <tr class="${shouldBreak ? 'page-break-before' : ''}" style="page-break-inside: avoid; ${shouldBreak ? 'page-break-before: always;' : ''}">
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; word-wrap: break-word;">${invoice.invoiceNo || ''}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px;">${invoice.date || ''}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; word-wrap: break-word; overflow: hidden; text-overflow: ellipsis;">${(invoice.customerName || '').substring(0, 25)}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px;">${invoice.gstin || ''}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${formatNumber(invoice.totals?.taxable || 0)}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${formatNumber(invoice.totals?.cgst || 0)}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${formatNumber(invoice.totals?.sgst || 0)}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${formatNumber(invoice.totals?.igst || 0)}</td>
              <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right; font-weight: bold;">${formatNumber(invoice.totals?.grandTotal || 0)}</td>
            </tr>
          `
          })
          content += `
            </tbody>
            <tfoot style="display: table-footer-group; page-break-inside: avoid;">
              <tr style="background-color: #f9fafb; font-weight: bold; page-break-inside: avoid;">
                <td colspan="4" style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">TOTAL:</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">${formatNumber(summary.taxable)}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">${formatNumber(summary.cgst)}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">${formatNumber(summary.sgst)}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">${formatNumber(summary.igst)}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">${formatNumber(summary.totalTax + summary.taxable)}</td>
              </tr>
            </tfoot>
          </table>
        `
        }
      } else if (type === 'gstr3b') {
        content += `
          <h2 style="color: #333; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-top: 15px; font-size: 18px;">GSTR-3B Summary</h2>
          <div style="margin-top: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; max-width: 100%;">
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9fafb; font-weight: bold; width: 40%;">Intra-state Taxable</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(summary.intraStateTaxable || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9fafb; font-weight: bold;">Inter-state Taxable</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(summary.interStateTaxable || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9fafb; font-weight: bold;">CGST</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(summary.cgst)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9fafb; font-weight: bold;">SGST</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(summary.sgst)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9fafb; font-weight: bold;">IGST</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(summary.igst)}</td>
              </tr>
              <tr style="background-color: #dbeafe;">
                <td style="padding: 12px; border: 2px solid #1e40af; font-weight: bold; font-size: 14px;">Total Tax Payable</td>
                <td style="padding: 12px; border: 2px solid #1e40af; text-align: right; font-weight: bold; font-size: 14px;">${formatNumber(summary.totalTax)}</td>
              </tr>
            </table>
          </div>
        `
      } else if (type === 'purchases') {
        if (filteredPurchases.length === 0) {
          content += `
            <div style="text-align: center; padding: 40px; color: #666;">
              <p style="font-size: 16px;">No purchases found for period ${period}</p>
            </div>
          `
        } else {
          content += `
          <h2 style="color: #333; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-top: 15px; font-size: 18px;">Purchase Register (ITC)</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 7px; page-break-inside: avoid; display: table; table-layout: fixed;">
            <colgroup>
              <col style="width: 10%;">
              <col style="width: 18%;">
              <col style="width: 10%;">
              <col style="width: 20%;">
              <col style="width: 10%;">
              <col style="width: 8%;">
              <col style="width: 12%;">
              <col style="width: 12%;">
            </colgroup>
            <thead style="display: table-header-group; page-break-after: avoid;">
              <tr style="background-color: #f3f4f6; page-break-inside: avoid;">
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">Date</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">Supplier</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">Bill No</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 7px;">Item</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">Taxable</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">Tax %</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">ITC</th>
                <th style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 7px;">Total</th>
              </tr>
            </thead>
            <tbody style="display: table-row-group;">
        `
        let itemIndex = 0
        filteredPurchases.forEach((purchase) => {
          purchase.items?.forEach((item) => {
            const qty = Number(item.qty) || 0
            const rate = Number(item.rate) || 0
            const taxPercent = Number(item.taxPercent) || 0
            const taxable = qty * rate
            const taxAmount = (taxable * taxPercent) / 100
            // Add page break every 25 items
            const shouldBreak = itemIndex > 0 && itemIndex % 25 === 0
            content += `
              <tr class="${shouldBreak ? 'page-break-before' : ''}" style="page-break-inside: avoid; ${shouldBreak ? 'page-break-before: always;' : ''}">
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px;">${purchase.date || ''}</td>
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; word-wrap: break-word; overflow: hidden; text-overflow: ellipsis;">${(purchase.supplier || '').substring(0, 25)}</td>
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px;">${purchase.billNo || ''}</td>
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; word-wrap: break-word; overflow: hidden; text-overflow: ellipsis;">${(item.description || '').substring(0, 30)}</td>
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${formatNumber(taxable)}</td>
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${taxPercent}%</td>
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${formatNumber(taxAmount)}</td>
                <td style="border: 1px solid #ddd; padding: 3px; font-size: 7px; text-align: right;">${formatNumber(purchase.totals?.grandTotal || 0)}</td>
              </tr>
            `
            itemIndex++
          })
        })
        content += `
            </tbody>
            <tfoot style="display: table-footer-group; page-break-inside: avoid;">
              <tr style="background-color: #f0fdf4; font-weight: bold; page-break-inside: avoid;">
                <td colspan="4" style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">TOTAL ITC AVAILABLE:</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">${formatNumber(purchaseSummary.taxable)}</td>
                <td style="border: 1px solid #ddd; padding: 5px;"></td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px; color: #16a34a;">${formatNumber(purchaseSummary.tax)}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: right; font-size: 8px;">${formatNumber(purchaseSummary.total)}</td>
              </tr>
            </tfoot>
          </table>
        `
        }
      }

      content += `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 10px;">
            <p>This is a computer-generated report. For official purposes, please use the CSV exports.</p>
          </div>
        </div>
      `
      return content
    }

    // Create temporary element for PDF - make it visible and properly sized
    const tempDiv = document.createElement('div')
    const pdfContent = createPdfContent()
    
    // Determine orientation and dimensions
    const isLandscape = type === 'gstr1' || type === 'purchases'
    const pdfWidth = isLandscape ? 11.69 : 8.27 // A4 dimensions in inches
    const pdfHeight = isLandscape ? 8.27 : 11.69
    const contentWidth = isLandscape ? 1000 : 700 // pixels
    
    // Set all styles to ensure visibility
    tempDiv.innerHTML = pdfContent
    tempDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${contentWidth}px;
      min-height: 600px;
      padding: 30px;
      background-color: white;
      z-index: 999999;
      visibility: visible;
      opacity: 1;
      display: block;
      overflow: visible;
      box-sizing: border-box;
    `
    
    document.body.appendChild(tempDiv)

    // Force multiple reflows to ensure rendering
    void tempDiv.offsetHeight
    void tempDiv.scrollHeight
    void tempDiv.clientHeight

    // Wait longer for rendering, then generate PDF
    setTimeout(() => {
      if (tempDiv.innerHTML.length === 0) {
        if (tempDiv && tempDiv.parentNode) {
          document.body.removeChild(tempDiv)
        }
        return
      }
      
      const opt = {
        margin: [0.4, 0.4],
        filename: `${type.toUpperCase()}-${period}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 1.5,
          useCORS: true,
          logging: false,
          letterRendering: true,
          width: contentWidth,
          height: Math.max(tempDiv.scrollHeight, 600),
          windowWidth: contentWidth,
          allowTaint: true,
        },
        jsPDF: { 
          unit: 'in', 
          format: [pdfWidth, pdfHeight],
          orientation: isLandscape ? 'landscape' : 'portrait',
          compress: true,
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['tr', 'thead', 'tfoot', 'table']
        },
      }
      
      html2pdf()
        .set(opt)
        .from(tempDiv)
        .save()
        .then(() => {
          setTimeout(() => {
            if (tempDiv && tempDiv.parentNode) {
              document.body.removeChild(tempDiv)
            }
          }, 1000)
        })
        .catch((error) => {
          console.error('PDF generation error:', error)
          if (tempDiv && tempDiv.parentNode) {
            document.body.removeChild(tempDiv)
          }
        })
    }, 500)
  }

  return (
    <div className="space-y-6 w-full relative">
      <PullToRefreshIndicator state={pullToRefresh} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
          title="GST Report"
          subtitle="Monthly tax summary and GSTR exports"
        />
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full sm:w-auto"
          />
        </div>
      
      <section className="glass-panel p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs uppercase text-gray-500 mb-1">Taxable</p>
            <p className="text-lg md:text-xl font-semibold text-gray-900">{formatCurrency(summary.taxable)}</p>
          </div>
          <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs uppercase text-gray-500 mb-1">CGST</p>
            <p className="text-lg md:text-xl font-semibold text-gray-900">{formatCurrency(summary.cgst)}</p>
          </div>
          <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs uppercase text-gray-500 mb-1">SGST</p>
            <p className="text-lg md:text-xl font-semibold text-gray-900">{formatCurrency(summary.sgst)}</p>
          </div>
          <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs uppercase text-gray-500 mb-1">IGST</p>
            <p className="text-lg md:text-xl font-semibold text-gray-900">{formatCurrency(summary.igst)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <button className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => downloadCsv('gstr1')}>
              <span className="hidden sm:inline">Export GSTR-1 CSV</span>
              <span className="sm:hidden">GSTR-1 CSV</span>
            </button>
            <button className="btn-secondary text-xs px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => downloadPdf('gstr1')}>
              📄 GSTR-1 PDF
            </button>
          </div>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <button className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => downloadCsv('gstr3b')}>
              <span className="hidden sm:inline">Export GSTR-3B CSV</span>
              <span className="sm:hidden">GSTR-3B CSV</span>
            </button>
            <button className="btn-secondary text-xs px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => downloadPdf('gstr3b')}>
              📄 GSTR-3B PDF
            </button>
          </div>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <button className="btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => downloadCsv('purchases')}>
              <span className="hidden sm:inline">Export Purchases CSV</span>
              <span className="sm:hidden">Purchases CSV</span>
          </button>
            <button className="btn-secondary text-xs px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => downloadPdf('purchases')}>
              📄 Purchases PDF
          </button>
          </div>
          <div className="flex flex-col gap-1.5 sm:gap-2 col-span-2 sm:col-span-1">
            <button className="btn-success text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" onClick={() => downloadPdf('summary')}>
              <span className="hidden sm:inline">📄 Full Summary PDF</span>
              <span className="sm:hidden">📄 Summary</span>
          </button>
        </div>
        </div>
        
        {filteredPurchases.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Purchase Summary (ITC Available):</span>
              <span className="text-sm font-semibold text-green-700">
                {formatCurrency(purchaseSummary.tax)} ITC
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Taxable: {formatCurrency(purchaseSummary.taxable)} • Total: {formatCurrency(purchaseSummary.total)} • {filteredPurchases.length} purchase(s)
            </div>
          </div>
        )}
      </section>

      <section className="glass-panel overflow-x-auto" ref={summaryRef}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Invoice-wise Report</h3>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="text-right">Taxable</th>
                  <th className="text-right">CGST</th>
                  <th className="text-right">SGST</th>
                  <th className="text-right">IGST</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-medium text-gray-900">{invoice.invoiceNo}</td>
                    <td className="text-gray-600">{invoice.customerName}</td>
                    <td className="text-gray-600">{invoice.date}</td>
                    <td className="text-right">{formatCurrency(invoice.totals?.taxable || 0)}</td>
                    <td className="text-right">{formatCurrency(invoice.totals?.cgst || 0)}</td>
                    <td className="text-right">{formatCurrency(invoice.totals?.sgst || 0)}</td>
                    <td className="text-right">{formatCurrency(invoice.totals?.igst || 0)}</td>
                    <td className="text-right font-medium">{formatCurrency(invoice.totals?.grandTotal || 0)}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan="8" className="p-6 md:p-8 text-center text-gray-500">
                      No invoices for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-4 pb-3 border-b border-gray-200">HSN Summary</h3>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full">
              <thead>
                <tr>
                  <th>HSN</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Taxable</th>
                  <th className="text-right">Tax Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(hsnSummary).map((row) => (
                  <tr key={row.hsn}>
                    <td className="font-medium text-gray-900">{row.hsn}</td>
                    <td className="text-right text-gray-600">{row.qty}</td>
                    <td className="text-right">{formatCurrency(row.taxable)}</td>
                    <td className="text-right font-medium">{formatCurrency(row.tax)}</td>
                  </tr>
                ))}
                {!Object.keys(hsnSummary).length && (
                  <tr>
                    <td colSpan="4" className="p-6 md:p-8 text-center text-gray-500">
                      No HSN data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

