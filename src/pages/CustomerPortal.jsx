import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import PDFGenerator from '../components/PDFGenerator'
import { formatCurrency } from '../lib/taxUtils'
import { format } from 'date-fns'
import { BRAND } from '../data/branding'
import { useToast } from '../components/ToastContainer'

// Direct link to Google Review form using short link format
const GOOGLE_REVIEW_URL = 'https://g.page/r/Cfc9X2_ohssSEBM/review'

export default function CustomerPortal() {
  const { invoices } = useData()
  const [searchPhone, setSearchPhone] = useState('')
  const [searchError, setSearchError] = useState('')
  const toast = useToast()

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

  const handlePDFDownload = (invoice) => {
    toast.success(`PDF downloaded successfully! Invoice #${invoice.invoiceNo}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Premium Header - Compact */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-xl border-b-2 border-blue-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 sm:gap-4">
            {/* Left Side - Logo and Brand */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Logo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden p-2 ring-2 ring-white/20 flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="BPH Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-blue-600 font-bold text-2xl sm:text-3xl lg:text-4xl">B</span></div>'
                  }}
                />
              </div>
              {/* Brand Info */}
              <div className="text-left flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-0.5 drop-shadow-lg truncate">
                  Biswajit Power Hub
                </h1>
                <p className="text-xs sm:text-sm text-blue-100 font-medium truncate">Customer Invoice Portal</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <svg className="w-3 h-3 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-[10px] sm:text-xs text-blue-200 font-medium">Secure & Verified</span>
                </div>
              </div>
            </div>
            
            {/* Right Side - Contact Information */}
            <div className="text-left sm:text-right space-y-1.5 sm:space-y-2 w-full sm:w-auto sm:min-w-[200px]">
              {BRAND.contact && BRAND.contact[0] && (
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <svg className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${BRAND.contact[0].replace(/\D/g, '')}`} className="text-xs sm:text-sm text-white hover:text-blue-200 font-medium transition-colors truncate">
                    {BRAND.contact[0]}
                  </a>
                </div>
              )}
              {BRAND.email && (
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <svg className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${BRAND.email}`} className="text-xs sm:text-sm text-white hover:text-blue-200 font-medium transition-colors truncate">
                    {BRAND.email}
                  </a>
                </div>
              )}
              {BRAND.address && (
                <div className="flex items-start gap-1.5 sm:justify-end">
                  <svg className="w-3.5 h-3.5 text-blue-200 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-[10px] sm:text-xs text-blue-100 font-medium max-w-[180px] sm:max-w-xs lg:max-w-sm line-clamp-2">
                    {BRAND.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Compact */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Premium Search Section - Compact */}
        <section className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-3 shadow-md">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">Search Your Invoices</h2>
            <p className="text-xs sm:text-sm text-gray-600">Enter your phone number to view and download your invoices</p>
          </div>
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label htmlFor="phone-search" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                Enter Your Phone Number
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
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
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-lg font-medium transition-all shadow-sm hover:shadow-md"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  inputMode="numeric"
                />
                <button
                  type="submit"
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap text-sm sm:text-base"
                >
                  Search
                </button>
              </div>
              {searchError && (
                <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2" role="alert">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          </form>
        </section>

        {/* Premium Results Section - Compact */}
        {searchPhone && searchPhone.trim().length >= 10 && (
          <section className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-0.5">
                  Your Invoices
                </h2>
                {customerInvoices.length > 0 && (
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    {customerInvoices.length} invoice{customerInvoices.length !== 1 ? 's' : ''} found
                  </p>
                )}
              </div>
            </div>

            {customerInvoices.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-700 mb-1">No invoices found</p>
                <p className="text-sm text-gray-600">No invoices found for this phone number</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border-2 border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                              Invoice #{invoice.invoiceNo}
                            </h3>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : invoice.status === 'sent'
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {invoice.status === 'paid' ? '✓ Paid' : invoice.status === 'sent' ? '⏳ Pending' : '📝 Draft'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Date</p>
                            <p className="text-xs sm:text-sm font-bold text-gray-900">
                              {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : '--'}
                            </p>
                          </div>
                          <div className="bg-blue-50 rounded-md p-2">
                            <p className="text-[10px] font-semibold text-blue-600 uppercase mb-0.5">Amount</p>
                            <p className="text-sm sm:text-base font-bold text-blue-700">
                              {formatCurrency(invoice.totals?.grandTotal || 0)}
                            </p>
                          </div>
                          {invoice.dueDate && invoice.status !== 'paid' && (
                            <div className="bg-orange-50 rounded-md p-2 col-span-2 sm:col-span-1">
                              <p className="text-[10px] font-semibold text-orange-600 uppercase mb-0.5">Due Date</p>
                              <p className="text-xs sm:text-sm font-bold text-orange-700">
                                {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 sm:ml-3">
                        <PDFGenerator
                          invoice={invoice}
                          label="Download PDF"
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onDownload={handlePDFDownload}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Premium Google Review Section - Compact */}
        <section className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-200 p-4 sm:p-5 lg:p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-3 sm:mb-4 shadow-md">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Help Us Improve</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 max-w-2xl mx-auto">
              We value your feedback! Your review helps us serve you better.
            </p>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-300 rounded-lg font-bold text-gray-900 hover:border-blue-500 hover:text-blue-600 hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm sm:text-base"
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

      {/* Premium Footer - Compact */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white mt-6 sm:mt-8">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 text-center">
          <p className="text-xs sm:text-sm text-gray-300">
            &copy; {new Date().getFullYear()} <span className="font-bold">Biswajit Power Hub</span>. All rights reserved.
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Secure • Reliable • Professional</p>
        </div>
      </footer>
    </div>
  )
}

