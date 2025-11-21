import { format } from 'date-fns'

export function makeInvoiceNo(seq, date = new Date(), prefix = 'BPH') {
  const YYYYMM = date.toISOString().slice(0, 7).replace('-', '')
  return `${prefix}-${YYYYMM}-${String(seq).padStart(4, '0')}`
}

export function isIntraState(customerState, companyState) {
  return (customerState || '').toLowerCase() === (companyState || '').toLowerCase()
}

export function calculateTaxSplit(taxable, taxPercent, intraState) {
  const tax = +(taxable * (taxPercent / 100)).toFixed(2)
  if (intraState) {
    const half = +(tax / 2).toFixed(2)
    return { cgst: half, sgst: half, igst: 0, tax }
  }
  return { cgst: 0, sgst: 0, igst: tax, tax }
}

export function calculateInvoiceTotals(items, customerState, companyState) {
  let taxable = 0
  let cgst = 0
  let sgst = 0
  let igst = 0

  const rows = items.map((item) => {
    const lineTaxable = +(item.qty * item.rate || 0).toFixed(2)
    const intraState = isIntraState(customerState, companyState)
    const { cgst: lineCgst, sgst: lineSgst, igst: lineIgst, tax } = calculateTaxSplit(
      lineTaxable,
      item.taxPercent || 0,
      intraState,
    )

    taxable += lineTaxable
    cgst += lineCgst
    sgst += lineSgst
    igst += lineIgst

    return {
      ...item,
      taxable: lineTaxable,
      tax,
      total: +(lineTaxable + tax).toFixed(2),
    }
  })

  const grandTotal = +(taxable + cgst + sgst + igst).toFixed(2)

  return {
    rows,
    totals: {
      taxable: +taxable.toFixed(2),
      cgst: +cgst.toFixed(2),
      sgst: +sgst.toFixed(2),
      igst: +igst.toFixed(2),
      roundOff: +(Math.round(grandTotal) - grandTotal).toFixed(2),
      grandTotal: +Math.round(grandTotal).toFixed(2),
    },
  }
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const SCALES = ['Crore', 'Lakh', 'Thousand', 'Hundred']
const SCALE_VALUES = [10000000, 100000, 1000, 100]

function wordsBelowHundred(num) {
  if (num < 20) return ONES[num]
  const ten = Math.floor(num / 10)
  const rest = num % 10
  return `${TENS[ten]}${rest ? ` ${ONES[rest]}` : ''}`.trim()
}

export function amountToWords(amount) {
  if (amount === 0) return 'Zero Rupees Only'

  let num = Math.floor(amount)
  let result = ''

  SCALE_VALUES.forEach((value, idx) => {
    if (num >= value) {
      const scaleValue = Math.floor(num / value)
      num %= value
      result += `${wordsBelowHundred(scaleValue)} ${SCALES[idx]} `
    }
  })

  if (num > 0) {
    result += wordsBelowHundred(num)
  }

  return `${result.trim()} Rupees Only`
}

export function formatInvoiceDate(date) {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0)
}

