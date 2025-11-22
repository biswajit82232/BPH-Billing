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

function RoutedApp() {
  const { loading, loadingProgress, firebaseReady } = useData()

  return (
    <>
      {loading && firebaseReady && <LoadingState progress={loadingProgress} />}
    <Layout>
      <Suspense fallback={!loading ? <LoadingState progress={50} /> : null}>
      <Routes>
        <Route path="/" element={<ProtectedRoute pageKey="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute pageKey="invoices"><InvoiceList /></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute pageKey="invoices"><CreateInvoice /></ProtectedRoute>} />
        <Route path="/invoices/:invoiceId" element={<ProtectedRoute pageKey="invoices"><CreateInvoice /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute pageKey="customers"><Customers /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute pageKey="products"><Products /></ProtectedRoute>} />
        <Route path="/gst-report" element={<ProtectedRoute pageKey="gst-report"><GSTReport /></ProtectedRoute>} />
        <Route path="/aging-report" element={<ProtectedRoute pageKey="aging-report"><AgingReport /></ProtectedRoute>} />
        <Route path="/backup" element={<ProtectedRoute pageKey="settings"><BackupRestore /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Layout>
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
        <LoginGate>
          <RoutedApp />
        </LoginGate>
        </ToastProvider>
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
