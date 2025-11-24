import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import LoginGate from './components/LoginGate'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/ToastContainer'
import LoadingState from './components/LoadingState'
import { DataProvider, useData } from './context/DataContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import OfflineModuleFallback from './components/OfflineModuleFallback'

const lazyWithOfflineFallback = (importer, featureName) =>
  lazy(() =>
    importer().catch((error) => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
      const isChunkFailure =
        typeof error?.message === 'string' &&
        (error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading chunk') ||
          error.message.includes('Importing a module script failed'))

      if (isOffline || isChunkFailure) {
        console.warn(`Falling back to offline placeholder for ${featureName}`, error)
        return {
          default: () => <OfflineModuleFallback featureName={featureName} />,
        }
      }

      throw error
    }),
  )

// Lazy load heavy pages for code splitting
const Dashboard = lazyWithOfflineFallback(() => import('./pages/Dashboard'), 'Dashboard')
const CreateInvoice = lazyWithOfflineFallback(() => import('./pages/CreateInvoice'), 'Create Invoice')
const InvoiceList = lazyWithOfflineFallback(() => import('./pages/InvoiceList'), 'Invoices')
const Customers = lazyWithOfflineFallback(() => import('./pages/Customers'), 'Customers')
const Products = lazyWithOfflineFallback(() => import('./pages/Products'), 'Products')
const GSTReport = lazyWithOfflineFallback(() => import('./pages/GSTReport'), 'GST Report')
const AgingReport = lazyWithOfflineFallback(() => import('./pages/AgingReport'), 'Aging Report')
const BackupRestore = lazyWithOfflineFallback(() => import('./pages/BackupRestore'), 'Settings & Backup')
const CustomerPortal = lazyWithOfflineFallback(() => import('./pages/CustomerPortal'), 'Customer Portal')

function RoutedApp() {
  const { loading, loadingProgress, firebaseReady } = useData()

  return (
    <>
      {loading && firebaseReady && <LoadingState progress={loadingProgress} />}
      <Suspense fallback={!loading ? <LoadingState progress={50} /> : null}>
        <Routes>
          {/* Public customer portal route - no layout or protection */}
          <Route path="/portal" element={<CustomerPortal />} />
          
          {/* Protected admin routes */}
          <Route path="/" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="dashboard"><Dashboard /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/invoices" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="invoices"><InvoiceList /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/invoices/new" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="invoices"><CreateInvoice /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/invoices/:invoiceId" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="invoices"><CreateInvoice /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/customers" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="customers"><Customers /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/products" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="products"><Products /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/gst-report" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="gst-report"><GSTReport /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/aging-report" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="aging-report"><AgingReport /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="/backup" element={
            <LoginGate>
              <Layout>
                <ProtectedRoute pageKey="settings"><BackupRestore /></ProtectedRoute>
              </Layout>
            </LoginGate>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <DataProvider>
        <AuthProvider>
        <ToastProvider>
          <RoutedApp />
        </ToastProvider>
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
