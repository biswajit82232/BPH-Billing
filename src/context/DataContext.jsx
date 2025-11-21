import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { ref, onValue, set, update, remove, off } from 'firebase/database'
// Mock data removed - using empty initial state
import { ensureFirebase, getFirebaseDatabase, isFirebaseConfigured } from '../lib/firebase'
import { loadPendingInvoices, persistPendingInvoices, loadLocalData, saveLocalData, clearLocalData, clearPendingInvoices } from '../lib/storage'
import { calculateInvoiceTotals, makeInvoiceNo } from '../lib/taxUtils'

const DataContext = createContext()

const defaultState = {
  invoices: [],
  customers: [],
  products: [],
  purchases: [],
  meta: {
    lastInvoiceNo: 0,
    lastCustomerNo: 0,
  },
  settings: {
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyGstin: '19AKFPH1283D1ZE',
    companyState: '',
    invoicePrefix: 'INV',
    invoiceStyle: 'style1',
  },
  activity: [],
}

const resolveDb = () => {
  if (!isFirebaseConfigured()) return null
  const { db } = ensureFirebase()
  return db
}

export const DataProvider = ({ children }) => {
  // Check if data contains sample/mock data IDs
  const isSampleData = (data) => {
    if (!data) return false
    
    // Check for known sample data patterns
    const sampleCustomerNames = ['Arijit Saha', 'Neha Enterprises', 'Assam Electric Garage', 'Odisha Green Mobility', 'Maya E-Rides']
    const sampleProductNames = ['48V 120Ah Lithium Battery', 'E-Rickshaw Controller 60A', 'Brushless Hub Motor 1000W']
    const sampleIds = ['cust-001', 'cust-002', 'cust-003', 'cust-004', 'cust-005', 'prod-001', 'prod-002', 'prod-003', 'inv-']
    
    const hasSampleCustomers = data.customers?.some(c => 
      sampleIds.some(id => c.id?.startsWith(id)) || 
      sampleCustomerNames.includes(c.name)
    )
    const hasSampleProducts = data.products?.some(p => 
      sampleIds.some(id => p.id?.startsWith(id)) || 
      sampleProductNames.some(name => p.name?.includes(name))
    )
    const hasSampleInvoices = data.invoices?.some(i => 
      sampleIds.some(id => i.id?.startsWith(id) || i.invoiceNo?.startsWith('INV-2024')) ||
      sampleCustomerNames.some(name => i.customerName?.includes(name))
    )
    
    return hasSampleCustomers || hasSampleProducts || hasSampleInvoices
  }

  // Load from localStorage if Firebase is not configured
  const loadInitialData = () => {
    if (typeof window === 'undefined') return defaultState
    if (isFirebaseConfigured()) return defaultState
    
    const localData = loadLocalData()
    
    // Clear sample data if detected
    if (localData && isSampleData(localData)) {
      console.log('Sample data detected in localStorage. Clearing...')
      clearLocalData()
      clearPendingInvoices() // Also clear pending invoices queue
      return defaultState
    }
    
    // Check and clear pending invoices if they contain sample data
    const pending = loadPendingInvoices()
    if (pending.length > 0) {
      const hasSamplePending = pending.some(inv => {
        const sampleNames = ['Arijit Saha', 'Neha Enterprises', 'Assam Electric Garage', 'Odisha Green Mobility', 'Maya E-Rides']
        return sampleNames.some(name => inv.customerName?.includes(name)) || 
               inv.invoiceNo?.startsWith('INV-2024') ||
               inv.id?.startsWith('inv-')
      })
      if (hasSamplePending) {
        console.log('Sample data detected in pending invoices. Clearing...')
        clearPendingInvoices()
      }
    }
    
    if (localData) {
      return {
        invoices: localData.invoices || [],
        customers: localData.customers || [],
        products: localData.products || [],
        purchases: localData.purchases || [],
        settings: localData.settings || defaultState.settings,
        meta: localData.meta || defaultState.meta,
        activity: localData.activity || [],
      }
    }
    return defaultState
  }

  const initialData = loadInitialData()
  
  const [invoices, setInvoices] = useState(initialData.invoices)
  const [customers, setCustomers] = useState(initialData.customers)
  const [products, setProducts] = useState(initialData.products)
  const [purchases, setPurchases] = useState(initialData.purchases)
  const [settings, setSettings] = useState(initialData.settings)
  const [meta, setMeta] = useState(initialData.meta)
  const [activity, setActivity] = useState(initialData.activity)
  const [pendingInvoices, setPendingInvoices] = useState(() =>
    typeof window === 'undefined' ? [] : loadPendingInvoices(),
  )
  const [loading, setLoading] = useState(!!isFirebaseConfigured())
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  const db = resolveDb()
  const firebaseReady = Boolean(db)
  
  // Save to localStorage whenever data changes (if Firebase is not configured)
  useEffect(() => {
    if (!firebaseReady && typeof window !== 'undefined') {
      // Check if localStorage already has data (user has used the app before)
      const existingData = loadLocalData()
      
      // Only save if localStorage already has data or user has created data
      const hasExistingData = existingData !== null
      const hasUserData = invoices.length > 0 || customers.length > 0 || products.length > 0
      
      if (hasExistingData || hasUserData) {
        saveLocalData({
          invoices,
          customers,
          products,
          purchases,
          settings,
          meta,
          activity,
        })
      }
    }
  }, [invoices, customers, products, purchases, settings, meta, activity, firebaseReady])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false)
      setLoadingProgress(0)
      return
    }

    setLoading(true)
    setLoadingProgress(0)
    const unsubscribes = []
    let loadedCount = 0
    const totalSources = 7 // invoices, customers, products, purchases, meta, settings, activity

    const updateProgress = () => {
      loadedCount++
      const progress = Math.round((loadedCount / totalSources) * 100)
      setLoadingProgress(progress)
      if (loadedCount === totalSources) {
        // Small delay to show 100% before hiding
        setTimeout(() => {
          setLoading(false)
          setLoadingProgress(0)
        }, 200)
      }
    }

    const bindList = (path, setter, fallback = []) => {
      const dataRef = ref(db, path)
      const listener = onValue(
        dataRef,
        (snapshot) => {
          const value = snapshot.val()
          if (value) {
            const dataArray = Array.isArray(value) ? value : Object.values(value)
            // Check if Firebase data contains sample data
            const dataToCheck = { 
              [path === 'invoices' ? 'invoices' : path === 'customers' ? 'customers' : path === 'products' ? 'products' : 'purchases']: dataArray 
            }
            if (isSampleData(dataToCheck)) {
              console.log(`Sample data detected in Firebase ${path}. Clearing...`)
              set(ref(db, path), {}) // Clear Firebase data
              setter([])
            } else {
              setter(dataArray)
            }
          } else {
            setter(fallback)
          }
          updateProgress()
        },
        (error) => {
          console.warn(`Firebase subscription error at ${path}`, error)
          updateProgress()
        },
      )
      unsubscribes.push(() => {
        off(dataRef)
        listener()
      })
    }

    bindList('invoices', setInvoices, [])
    bindList('customers', setCustomers, [])
    bindList('products', setProducts, [])
    bindList('purchases', setPurchases, [])

    const metaRef = ref(db, 'meta')
    const metaListener = onValue(metaRef, (snapshot) => {
      if (snapshot.exists()) setMeta(snapshot.val())
      updateProgress()
    }, (error) => {
      console.warn('Firebase subscription error at meta', error)
      updateProgress()
    })
    unsubscribes.push(() => {
      off(metaRef)
      metaListener()
    })

    const settingsRef = ref(db, 'settings')
    const settingsListener = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        // Firebase has settings - use them (this is the source of truth)
        const firebaseSettings = snapshot.val()
        setSettings(firebaseSettings)
        // Also save to localStorage for offline access
        const localData = loadLocalData()
        if (localData) {
          saveLocalData({
            ...localData,
            settings: firebaseSettings,
          })
        }
      } else {
        // No settings in Firebase - check localStorage as fallback
        const localData = loadLocalData()
        if (localData && localData.settings) {
          setSettings(localData.settings)
          // Sync local settings to Firebase
          if (online) {
            set(ref(db, 'settings'), localData.settings).catch(console.warn)
          }
        }
      }
      updateProgress()
    }, (error) => {
      console.warn('Firebase subscription error at settings', error)
      // On error, fallback to localStorage
      const localData = loadLocalData()
      if (localData && localData.settings) {
        setSettings(localData.settings)
      }
      updateProgress()
    })
    unsubscribes.push(() => {
      off(settingsRef)
      settingsListener()
    })

    const activityRef = ref(db, 'activity')
    const activityListener = onValue(activityRef, (snapshot) => {
      if (snapshot.exists()) {
        const value = snapshot.val()
        const dataArray = Array.isArray(value) ? value : Object.values(value)
        setActivity(dataArray)
      }
      updateProgress()
    }, (error) => {
      console.warn('Firebase subscription error at activity', error)
      updateProgress()
    })
    unsubscribes.push(() => {
      off(activityRef)
      activityListener()
    })

    return () => unsubscribes.forEach((fn) => fn())
  }, [firebaseReady, db])

  const persistMeta = async (nextMeta) => {
    setMeta(nextMeta)
    if (!firebaseReady || !online) {
      // Save to localStorage when offline
      saveLocalData({
        invoices,
        customers,
        products,
        purchases,
        settings,
        meta: nextMeta,
        activity,
      })
      return
    }
    try {
    await set(ref(db, 'meta'), nextMeta)
    } catch (error) {
      console.warn('Failed to save meta to Firebase, saving locally:', error)
      saveLocalData({
        invoices,
        customers,
        products,
        purchases,
        settings,
        meta: nextMeta,
        activity,
      })
    }
  }

  const pushActivity = useCallback(async (message) => {
      const entry = {
        id: nanoid(),
        action: message,
        date: new Date().toISOString().slice(0, 10),
      }
    setActivity((prev) => {
      const updated = [entry, ...prev].slice(0, 20)
      // Save to localStorage immediately
      saveLocalData({
        invoices,
        customers,
        products,
        purchases,
        settings,
        meta,
        activity: updated,
      })
      return updated
    })
    
    // Sync to Firebase if online
    if (firebaseReady && online && db) {
      try {
        await set(ref(db, `activity/${entry.id}`), entry)
      } catch (error) {
        console.warn('Failed to save activity to Firebase:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, products, purchases, settings, meta])

  const writeInvoices = async (items) => {
    setInvoices(items)
    if (!firebaseReady) return
    const payload = items.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})
    await set(ref(db, 'invoices'), payload)
  }

  const enqueueInvoice = (invoice) => {
    setPendingInvoices((prev) => {
      const next = [...prev.filter((inv) => inv.id !== invoice.id), invoice]
      persistPendingInvoices(next)
      return next
    })
  }

  const syncPendingInvoices = useCallback(async () => {
    if (!firebaseReady || !online) return
    
    const currentPending = pendingInvoices
    if (currentPending.length === 0) return
    
    setSyncing(true)
    const successIds = []

    for (const invoice of currentPending) {
      try {
        await set(ref(db, `invoices/${invoice.id}`), invoice)
        successIds.push(invoice.id)
      } catch (error) {
        console.warn('Failed syncing invoice', invoice.id, error)
      }
    }

    if (successIds.length) {
      const nextPending = currentPending.filter((inv) => !successIds.includes(inv.id))
      setPendingInvoices(nextPending)
      persistPendingInvoices(nextPending)
      pushActivity(`${successIds.length} invoice(s) synced to Firebase`)
    }
    setSyncing(false)
  }, [firebaseReady, online, db, pendingInvoices])

  // Auto-sync pending invoices when coming back online
  useEffect(() => {
    if (online && firebaseReady && pendingInvoices.length > 0 && !syncing) {
      const timer = setTimeout(() => syncPendingInvoices(), 1000)
      return () => clearTimeout(timer)
    }
  }, [online, firebaseReady, pendingInvoices.length, syncPendingInvoices, syncing])

  // Sync all data to Firebase when coming back online
  useEffect(() => {
    if (!online || !firebaseReady || syncing) return

    const syncAllData = async () => {
      setSyncing(true)
      try {
        // Sync all data types to Firebase
        await Promise.all([
          set(ref(db, 'invoices'), invoices.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
          set(ref(db, 'customers'), customers.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
          set(ref(db, 'products'), products.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
          set(ref(db, 'purchases'), purchases.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
          set(ref(db, 'settings'), settings),
          set(ref(db, 'meta'), meta),
          set(ref(db, 'activity'), activity.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        ])
        console.log('All data synced to Firebase')
      } catch (error) {
        console.warn('Failed to sync all data to Firebase:', error)
      } finally {
        setSyncing(false)
      }
    }

    // Only sync if we have data and just came back online
    if (invoices.length > 0 || customers.length > 0 || products.length > 0) {
      const timer = setTimeout(syncAllData, 2000)
      return () => clearTimeout(timer)
    }
  }, [online, firebaseReady, db])

  const upsertInvoice = useCallback(async (form, status = 'draft') => {
    const seq = (meta?.invoiceSequence || 0) + 1
    const invoiceNo = form.invoiceNo || makeInvoiceNo(seq, new Date(form.date), settings.invoicePrefix)
    
    // Extract customer data properly
    const customerState = form.customer?.state || settings.companyState
    const customerName = form.customer?.name || ''
    const customerEmail = form.customer?.email || ''
    const customerPhone = form.customer?.phone || ''
    const customerGstin = form.customer?.gstin || ''
    const customerAddress = form.customer?.address || ''
    const customerAadhaar = form.customer?.aadhaar || ''
    const customerDob = form.customer?.dob || ''
    const customerId = form.customer?.id || null
    
    const { rows, totals } = calculateInvoiceTotals(
      form.items,
      customerState,
      settings.companyState,
    )

    const invoice = {
      id: form.id || nanoid(),
      invoiceNo,
      date: form.date || new Date().toISOString().slice(0, 10),
      terms: form.terms || 'Due on Receipt',
      dueDate: form.dueDate || form.date || new Date().toISOString().slice(0, 10),
      customerId: customerId,
      customerName: customerName,
      email: customerEmail,
      phone: customerPhone,
      gstin: customerGstin,
      address: customerAddress,
      aadhaar: customerAadhaar,
      dob: customerDob,
      place_of_supply: customerState,
      state: customerState,
      items: rows,
      totals,
      status,
      notes: form.notes || '',
      reverseCharge: form.reverseCharge || false,
      amountPaid: form.amountPaid || 0,
      synced: firebaseReady,
      createdAt: form.createdAt || Date.now(),
    }

    setInvoices((prev) => {
      const filtered = prev.filter((inv) => inv.id !== invoice.id)
      return [invoice, ...filtered].sort((a, b) => new Date(b.date) - new Date(a.date))
    })

    pushActivity(`${invoice.invoiceNo} saved as ${status}`)

    if (settings.stockUpdateMode === 'sent' && ['sent', 'paid'].includes(status)) {
      setProducts((prev) =>
        prev.map((prod) => {
          const line = rows.find((row) => row.productId === prod.id || row.description === prod.name)
          if (!line) return prod
          return { ...prod, stock: Math.max(prod.stock - line.qty, 0) }
        }),
      )
    }

    if (form.id) {
      // existing invoice, do not bump sequence
    } else {
      const nextMeta = { ...meta, invoiceSequence: seq }
      persistMeta(nextMeta)
    }

    // Save to localStorage immediately
    saveLocalData({
      invoices: [invoice, ...invoices.filter((inv) => inv.id !== invoice.id)],
      customers,
      products,
      purchases,
      settings,
      meta,
      activity,
    })

    // Sync to Firebase if online
    if (firebaseReady && online) {
    try {
      await set(ref(db, `invoices/${invoice.id}`), invoice)
    } catch (error) {
      enqueueInvoice(invoice)
      console.warn('Invoice saved locally; sync pending', error)
      }
    } else {
      enqueueInvoice(invoice)
    }
    return invoice
  }, [meta, settings, firebaseReady, online, db])

  const markInvoiceStatus = useCallback(async (invoiceId, status) => {
    setInvoices((prev) => {
      const updated = prev.map((inv) => {
        if (inv.id === invoiceId) {
          // When marking as paid, set amountPaid to full amount
          const updates = { status }
          if (status === 'paid') {
            updates.amountPaid = inv.totals?.grandTotal || 0
          }
          return { ...inv, ...updates }
        }
        return inv
      })
      // Save to localStorage immediately
      saveLocalData({
        invoices: updated,
        customers,
        products,
        purchases,
        settings,
        meta,
        activity,
      })
      return updated
    })
    
    pushActivity(`${invoiceId} marked ${status}`)

    // Sync to Firebase if online
    if (firebaseReady && online) {
      try {
    const invoice = invoices.find((inv) => inv.id === invoiceId)
    const updateData = { status }
    if (status === 'paid' && invoice) {
      updateData.amountPaid = invoice.totals?.grandTotal || 0
    }
    await update(ref(db, `invoices/${invoiceId}`), updateData)
      } catch (error) {
        console.warn('Failed to update invoice status in Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, products, purchases, settings, meta, activity])

  const deleteInvoice = useCallback(async (invoiceId) => {
    setInvoices((prev) => {
      const updated = prev.filter((inv) => inv.id !== invoiceId)
      // Save to localStorage immediately
      saveLocalData({
        invoices: updated,
        customers,
        products,
        purchases,
        settings,
        meta,
        activity,
      })
      return updated
    })
    
    pushActivity(`${invoiceId} deleted`)
    
    // Sync to Firebase if online
    if (firebaseReady && online) {
      try {
    await remove(ref(db, `invoices/${invoiceId}`))
      } catch (error) {
        console.warn('Failed to delete invoice from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, customers, products, purchases, settings, meta, activity])

  const upsertCustomer = useCallback(async (customer) => {
    const next = { 
      ...customer, 
      id: customer.id || nanoid(),
      totalPurchase: customer.totalPurchase || 0,
    }
    
    // Update local state immediately
    setCustomers((prev) => {
      const filtered = prev.filter((c) => c.id !== next.id)
      const updated = [next, ...filtered]
      // Save to localStorage immediately
      saveLocalData({
        invoices,
        customers: updated,
        products,
        purchases,
        settings,
        meta,
        activity,
      })
      return updated
    })
    
    pushActivity(`Customer "${next.name}" ${customer.id ? 'updated' : 'added'}`)
    
    // Save to Firebase if online
    if (firebaseReady && online) {
      try {
        await set(ref(db, `customers/${next.id}`), next)
      } catch (error) {
        console.warn('Failed to save customer to Firebase, saved locally:', error)
      }
    }
    
    return next
  }, [firebaseReady, online, db, invoices, products, purchases, settings, meta, activity])

  const upsertProduct = useCallback(async (product) => {
    const next = { ...product, id: product.id || nanoid() }
    setProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== next.id)
      const updated = [next, ...filtered]
      // Save to localStorage immediately
      saveLocalData({
        invoices,
        customers,
        products: updated,
        purchases,
        settings,
        meta,
        activity,
      })
      return updated
    })
    
    // Save to Firebase if online
    if (firebaseReady && online) {
      try {
    await set(ref(db, `products/${next.id}`), next)
      } catch (error) {
        console.warn('Failed to save product to Firebase, saved locally:', error)
      }
    }
    
    return next
  }, [firebaseReady, online, db, invoices, customers, purchases, settings, meta, activity])

  const deleteCustomer = useCallback(async (customerId) => {
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== customerId)
      // Save to localStorage immediately
      saveLocalData({
        invoices,
        customers: updated,
        products,
        purchases,
        settings,
        meta,
        activity,
      })
      return updated
    })
    
    pushActivity(`Customer deleted`)
    
    // Sync to Firebase if online
    if (firebaseReady && online) {
      try {
        await remove(ref(db, `customers/${customerId}`))
      } catch (error) {
        console.warn('Failed to delete customer from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, products, purchases, settings, meta, activity])

  const deleteProduct = useCallback(async (productId) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId)
      // Save to localStorage immediately
      saveLocalData({
        invoices,
        customers,
        products: updated,
        purchases,
        settings,
        meta,
        activity,
      })
      return updated
    })
    
    pushActivity(`Product deleted`)
    
    // Sync to Firebase if online
    if (firebaseReady && online) {
      try {
        await remove(ref(db, `products/${productId}`))
      } catch (error) {
        console.warn('Failed to delete product from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, purchases, settings, meta, activity])

  const savePurchase = useCallback(async (purchase) => {
    const next = { ...purchase, id: purchase.id || nanoid() }
    setPurchases((prev) => {
      const updated = [next, ...prev]
      // Save to localStorage immediately
      saveLocalData({
        invoices,
        customers,
        products,
        purchases: updated,
        settings,
        meta,
        activity,
      })
      return updated
    })
    
    // Save to Firebase if online
    if (firebaseReady && online) {
      try {
    await set(ref(db, `purchases/${next.id}`), next)
      } catch (error) {
        console.warn('Failed to save purchase to Firebase, saved locally:', error)
      }
    }
    
    return next
  }, [firebaseReady, online, db, invoices, customers, products, settings, meta, activity])

  const backupData = useCallback(() => ({
    invoices,
    customers,
    products,
    purchases,
    meta,
    settings,
  }), [invoices, customers, products, purchases, meta, settings])

  const restoreBackup = useCallback(async (payload) => {
    const safe = {
      invoices: payload.invoices || [],
      customers: payload.customers || [],
      products: payload.products || [],
      purchases: payload.purchases || [],
      meta: payload.meta || meta,
      settings: payload.settings || settings,
    }
    setInvoices(safe.invoices)
    setCustomers(safe.customers)
    setProducts(safe.products)
    setPurchases(safe.purchases)
    setMeta(safe.meta)
    setSettings(safe.settings)

    if (firebaseReady) {
      await Promise.all([
        set(ref(db, 'invoices'), safe.invoices.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'customers'), safe.customers.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'products'), safe.products.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'purchases'), safe.purchases.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'meta'), safe.meta),
      ])
    }
    pushActivity('Backup restored')
  }, [firebaseReady, db, meta, settings])

  const value = useMemo(
    () => ({
      invoices,
      customers,
      products,
      purchases,
      settings,
      meta,
      activity,
      pendingInvoices,
      syncing,
      online,
      loading,
      loadingProgress,
      firebaseReady,
      saveInvoice: upsertInvoice,
      markInvoiceStatus,
      deleteInvoice,
      upsertCustomer,
      deleteCustomer,
      upsertProduct,
      deleteProduct,
      savePurchase,
      updateSettings: async (nextSettings) => {
        const merged = { ...settings, ...nextSettings }
        setSettings(merged)
        
        // Save to localStorage immediately
        saveLocalData({
          invoices,
          customers,
          products,
          purchases,
          settings: merged,
          meta,
          activity,
        })
        
        // Sync to Firebase if online
        if (firebaseReady && online) {
          try {
            await set(ref(db, 'settings'), merged)
          } catch (error) {
            console.warn('Failed to save settings to Firebase, saved locally:', error)
          }
        }
        
        pushActivity('Settings updated')
      },
      backupData,
      restoreBackup,
      syncPendingInvoices,
    }),
    [
      invoices,
      customers,
      products,
      purchases,
      settings,
      meta,
      activity,
      pendingInvoices,
      syncing,
      online,
      loading,
      loadingProgress,
      firebaseReady,
      upsertInvoice,
      markInvoiceStatus,
      deleteInvoice,
      upsertCustomer,
      deleteCustomer,
      upsertProduct,
      deleteProduct,
      savePurchase,
      backupData,
      restoreBackup,
      syncPendingInvoices,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)

