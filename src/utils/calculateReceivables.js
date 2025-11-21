/**
 * Calculate receivables (outstanding amounts) for customers
 * This ensures consistent calculation across Dashboard, Customers, and Aging Report
 */

/**
 * Calculate total outstanding/receivables for a specific customer
 * @param {string} customerId - Customer ID
 * @param {Array} invoices - All invoices
 * @returns {number} Total outstanding amount
 */
export function calculateCustomerReceivables(customerId, invoices) {
  return invoices
    .filter(inv => 
      inv.customerId === customerId && 
      inv.status !== 'paid' &&
      inv.status !== 'draft'
    )
    .reduce((sum, inv) => {
      const total = inv.totals?.grandTotal || 0
      const paid = inv.amountPaid || 0
      return sum + Math.max(0, total - paid)
    }, 0)
}

/**
 * Calculate total receivables across all customers
 * @param {Array} invoices - All invoices
 * @returns {number} Total outstanding amount
 */
export function calculateTotalReceivables(invoices) {
  return invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'draft')
    .reduce((sum, inv) => {
      const total = inv.totals?.grandTotal || 0
      const paid = inv.amountPaid || 0
      return sum + Math.max(0, total - paid)
    }, 0)
}

/**
 * Calculate receivables by customer
 * @param {Array} customers - All customers
 * @param {Array} invoices - All invoices
 * @returns {Object} Map of customerId to receivables amount
 */
export function calculateReceivablesByCustomer(customers, invoices) {
  const receivablesMap = {}
  
  customers.forEach(customer => {
    receivablesMap[customer.id] = calculateCustomerReceivables(customer.id, invoices)
  })
  
  return receivablesMap
}

