import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import PDFGenerator from '../components/PDFGenerator'
import { formatCurrency } from '../lib/taxUtils'
import { format } from 'date-fns'

const GOOGLE_REVIEW_URL = 'https://www.google.com/maps/place/BISWAJIT+POWER+HUB/@24.1258096,88.2936705,17z/data=!4m8!3m7!1s0x39f97d8ca9a2f93f:0x12cb86e86f5f3df7!8m2!3d24.1258096!4d88.2936705!9m1!1b1!16s%2Fg%2F11yl__7jy2?entry=ttu&g_ep=EgoyMDI1MTExNy4wIKXMDSoASAFQAw%3D%3D'

export default function CustomerPortal() {
  const { invoices } = useData()
  const [searchPhone, setSearchPhone] = useState('')
  const [searchError, setSearchError] = useState('')

  const customerInvoices = useMemo(() => {
    if (!searchPhone || searchPhone.trim().length < 10) {
      return []
    }

    const phone = searchPhone.trim().replace(/\D/g, '') // Remove non-digits
    if (phone.length !== 10) {
      return []
    }

    return invoices.filter((invoice) => {
      const invoicePhone = (invoice.phone || '').replace(/\D/g, '')
      return invoicePhone === phone
    }).sort((a, b) => {
      // Sort by date descending (newest first)
      return new Date(b.date) - new Date(a.date)
    })
  }, [invoices, searchPhone])

  const handleSearch = (e) => {
    e.preventDefault()
    const phone = searchPhone.trim().replace(/\D/g, '')
    
    if (phone.length < 10) {
      setSearchError('Please enter a valid 10-digit phone number')
      return
    }

    if (customerInvoices.length === 0) {
      setSearchError('No invoices found for this phone number')
    } else {
      setSearchError('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Biswajit Power Hub</h1>
              <p className="text-sm text-gray-600 mt-1">Customer Invoice Portal</p>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="BPH Logo"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.innerHTML = '<span class="text-white font-bold text-lg">B</span>'
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Search Section */}
        <section className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Your Invoices</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="phone-search" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Your Phone Number
              </label>
              <div className="flex gap-2">
                 <input
                   id="phone-search"
                   type="tel"
                   placeholder="Enter 10-digit phone number"
                   value={searchPhone}
                   onChange={(e) => {
                     // Only allow digits, max 10
                     const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                     setSearchPhone(digits)
                     setSearchError('')
                   }}
                   className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                   maxLength={10}
                   pattern="[0-9]{10}"
                   inputMode="numeric"
                 />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </div>
              {searchError && (
                <p className="mt-2 text-sm text-red-600" role="alert">{searchError}</p>
              )}
            </div>
          </form>
        </section>

        {/* Results Section */}
        {searchPhone && searchPhone.trim().length >= 10 && (
          <section className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Invoices {customerInvoices.length > 0 && `(${customerInvoices.length})`}
              </h2>
            </div>

            {customerInvoices.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-gray-600">No invoices found for this phone number</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            Invoice #{invoice.invoiceNo}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'sent'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {invoice.status === 'paid' ? 'Paid' : invoice.status === 'sent' ? 'Pending' : 'Draft'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Date:</span>{' '}
                            {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : '--'}
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span>{' '}
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(invoice.totals?.grandTotal || 0)}
                            </span>
                          </div>
                          {invoice.dueDate && (
                            <div>
                              <span className="font-medium">Due Date:</span>{' '}
                              {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <PDFGenerator
                          invoice={invoice}
                          label="Download PDF"
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Google Review Section */}
        <section className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Help Us Improve</h2>
            <p className="text-sm text-gray-600 mb-4">
              We value your feedback! Please share your experience with us.
            </p>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-medium text-gray-900 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Leave a Google Review</span>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Biswajit Power Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

