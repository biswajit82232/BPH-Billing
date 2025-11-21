/* eslint-env jest */
import { calculateInvoiceTotals, makeInvoiceNo } from '../taxUtils'

describe('makeInvoiceNo', () => {
  it('builds padded invoice numbers for the given month', () => {
    const date = new Date('2025-01-15')
    expect(makeInvoiceNo(12, date, 'BPH')).toBe('BPH-202501-0012')
    expect(makeInvoiceNo(1, new Date('2024-12-01'), 'BPH')).toBe('BPH-202412-0001')
  })
})

describe('calculateInvoiceTotals', () => {
  const items = [
    { description: 'Battery', qty: 2, rate: 1000, taxPercent: 18 },
    { description: 'Controller', qty: 1, rate: 500, taxPercent: 12 },
  ]

  it('splits tax between CGST and SGST for intra-state customers', () => {
    const { totals } = calculateInvoiceTotals(items, 'West Bengal', 'West Bengal')
    expect(totals.cgst).toBeCloseTo(210, 2)
    expect(totals.sgst).toBeCloseTo(210, 2)
    expect(totals.igst).toBe(0)
  })

  it('applies IGST for inter-state customers', () => {
    const { totals } = calculateInvoiceTotals(items, 'Assam', 'West Bengal')
    expect(totals.cgst).toBe(0)
    expect(totals.sgst).toBe(0)
    expect(totals.igst).toBeCloseTo(420, 2)
  })
})

