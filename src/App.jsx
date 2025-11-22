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

// Lazy load heavy pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'))
const InvoiceList = lazy(() => import('./pages/InvoiceList'))
const Customers = lazy(() => import('./pages/Customers'))
const Products = lazy(() => import('./pages/Products'))
const GSTReport = lazy(() => import('./pages/GSTReport'))
const AgingReport = lazy(() => import('./pages/AgingReport'))
const BackupRestore = lazy(() => import('./pages/BackupRestore'))
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'))

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
