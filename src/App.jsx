import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LoginGate from './components/LoginGate'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/ToastContainer'
import LoadingState from './components/LoadingState'
import Dashboard from './pages/Dashboard'
import CreateInvoice from './pages/CreateInvoice'
import InvoiceList from './pages/InvoiceList'
import Customers from './pages/Customers'
import Products from './pages/Products'
import GSTReport from './pages/GSTReport'
import AgingReport from './pages/AgingReport'
import BackupRestore from './pages/BackupRestore'
import { DataProvider, useData } from './context/DataContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function RoutedApp() {
  const { loading, loadingProgress, firebaseReady } = useData()

  return (
    <>
      {loading && firebaseReady && <LoadingState progress={loadingProgress} />}
    <Layout>
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
