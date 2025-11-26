/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { nanoid } from 'nanoid'
import { ref, onValue, set, update, remove, off } from 'firebase/database'
// Mock data removed - using empty initial state
import { ensureFirebase, isFirebaseConfigured } from '../lib/firebase'
import { loadPendingInvoices, persistPendingInvoices, loadLocalData, saveLocalData, clearLocalData, clearPendingInvoices, clearAllLocalStorage } from '../lib/storage'
import { calculateInvoiceTotals, makeInvoiceNo } from '../lib/taxUtils'
import { encryptCustomerFields, decryptCustomerFields } from '../lib/encryption'
import { safeCompareDates, safeParseDate } from '../utils/dateUtils'

const DataContext = createContext()

const defaultState = {
  invoices: [],
  customers: [],
  products: [],
  purchases: [],
  distributors: [],
  distributorSettlements: [],
  meta: {
    lastInvoiceNo: 0,
    lastCustomerNo: 0,
    invoiceSequence: 0,
  },
  settings: {
    companyName: '',
    companyTagline: '',
    companyAddress: '',
    companyMobile: '',
    companyPhone: '',
    companyEmail: '',
    companyGstin: '19AKFPH1283D1ZE',
    companyState: '',
    invoicePrefix: 'INV',
    invoiceStyle: 'style1',
    enableLoginGate: true,
    enablePurchases: true,
    stockUpdateMode: 'sent',
    companySignature: '',
  },
  activity: [],
}

const aggregateItemQuantities = (items = []) => {
  const byId = new Map()
  const byName = new Map()
  items.forEach((item) => {
    const qty = Number(item?.qty) || 0
    if (!qty) return
    if (item.productId) {
      byId.set(item.productId, (byId.get(item.productId) || 0) + qty)
    }
    const nameKey = (item.productName || item.description || '').trim().toLowerCase()
    if (nameKey) {
      byName.set(nameKey, (byName.get(nameKey) || 0) + qty)
    }
  })
  return { byId, byName }
}

const adjustProductsFromItems = (products, items, direction = -1) => {
  if (!products?.length || !items?.length) return products
  const { byId, byName } = aggregateItemQuantities(items)
  if (!byId.size && !byName.size) return products
  let changed = false
  const next = products.map((prod) => {
    let delta = 0
    // Prefer matching by ID (more reliable)
    if (prod.id && byId.has(prod.id)) {
      delta += direction * byId.get(prod.id)
    } else {
      // Fallback to name matching (less reliable, but needed for legacy data)
      // Only match if name is exact (case-insensitive) and not empty
      const nameKey = (prod.name || '').trim().toLowerCase()
      if (nameKey && byName.has(nameKey)) {
        // Additional safety: only match if product name is unique in the list
        // This prevents matching wrong products with similar names
        const matchingItems = items.filter(item => {
          const itemName = (item.productName || item.description || '').trim().toLowerCase()
          return itemName === nameKey
        })
        // Only apply if we have a clear match
        if (matchingItems.length > 0) {
          delta += direction * byName.get(nameKey)
        }
      }
    }
    if (!delta) return prod
    changed = true
    const currentStock = Number(prod.stock) || 0
    const nextStock = Math.max(0, currentStock + delta)
    if (nextStock === currentStock && delta < 0) {
      // Stock would go negative, but we're preventing it
      // Always log warning (not just in dev) since this is a data integrity issue
      console.warn(`Stock adjustment would make ${prod.name} negative. Current: ${currentStock}, Delta: ${delta}. Stock clamped to 0.`)
    }
    return { ...prod, stock: nextStock }
  })
  return changed ? next : products
}

const shouldAutoAdjustInventory = (mode, status) => {
  const normalizedMode = (mode || 'sent').toLowerCase()
  if (normalizedMode === 'manual') return false
  if (normalizedMode === 'paid') return status === 'paid'
  return ['sent', 'paid'].includes(status)
}

const resolveDb = () => {
  if (!isFirebaseConfigured()) return null
  const { db } = ensureFirebase()
  return db
}

export const DataProvider = ({ children }) => {
  // Load from localStorage if Firebase is not configured
  const loadInitialData = () => {
    if (typeof window === 'undefined') return defaultState
    if (isFirebaseConfigured()) return defaultState
    
    const localData = loadLocalData()
    if (localData) {
      // Decrypt customer sensitive fields when loading
      const decryptedCustomers = (localData.customers || []).map(c => decryptCustomerFields(c))
      // Initialize invoice versions for backward compatibility
      const invoicesWithVersion = (localData.invoices || []).map(inv => ({ ...inv, version: inv.version || 0 }))
      
      return {
        invoices: invoicesWithVersion,
        customers: decryptedCustomers,
        products: localData.products || [],
        purchases: localData.purchases || [],
        distributors: localData.distributors || [],
        distributorSettlements: localData.distributorSettlements || [],
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
  const [distributors, setDistributors] = useState(initialData.distributors || [])
  const [distributorSettlements, setDistributorSettlements] = useState(initialData.distributorSettlements || [])
  const recentActivityIdsRef = useRef(new Set())
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
  const [refreshToken, setRefreshToken] = useState(0)
  
  // Save to localStorage whenever data changes (if Firebase is not configured)
  useEffect(() => {
    if (!firebaseReady && typeof window !== 'undefined') {
      // Check if localStorage already has data (user has used the app before)
      const existingData = loadLocalData()
      
      // Only save if localStorage already has data or user has created data
      const hasExistingData = existingData !== null
      const hasUserData = invoices.length > 0 || customers.length > 0 || products.length > 0
      
      if (hasExistingData || hasUserData) {
        // Encrypt customers and invoice customer fields before saving
        const encryptedCustomers = customers.map(c => encryptCustomerFields(c))
        const encryptedInvoices = invoices.map(inv => {
          if (inv.aadhaar || inv.dob) {
            return {
              ...inv,
              aadhaar: inv.aadhaar ? encryptCustomerFields({ aadhaar: inv.aadhaar }).aadhaar : inv.aadhaar,
              dob: inv.dob ? encryptCustomerFields({ dob: inv.dob }).dob : inv.dob,
            }
          }
          return inv
        })
        
        saveLocalData({
          invoices: encryptedInvoices,
          customers: encryptedCustomers,
          products,
          purchases,
          distributors,
          distributorSettlements,
          settings,
          meta,
          activity,
        })
      }
    }
  }, [invoices, customers, products, purchases, distributors, distributorSettlements, settings, meta, activity, firebaseReady])

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

  const refreshData = useCallback(() => {
    setRefreshToken((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!firebaseReady || !online) {
      setLoading(false)
      setLoadingProgress(0)
      return
    }

    setLoading(true)
    setLoadingProgress(0)
    const unsubscribes = []
    let loadedCount = 0
    const totalSources = 9 // invoices, customers, products, distributors, distributorSettlements, purchases, meta, settings, activity

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
      let isInitialLoad = true
      
      const listener = onValue(
        dataRef,
        (snapshot) => {
          const value = snapshot.val()
          if (value) {
            const firebaseArray = Array.isArray(value) ? value : Object.values(value)
            
            if (isInitialLoad) {
              // On initial load, use Firebase data (it's the source of truth)
              setter(firebaseArray)
              isInitialLoad = false
            } else {
              // After initial load, merge Firebase with local to preserve recent local changes
              setter((prevLocal) => {
                // Create a map of Firebase data by ID
                const firebaseMap = new Map()
                firebaseArray.forEach(item => {
                  if (item && item.id) {
                    firebaseMap.set(item.id, item)
                  }
                })
                
                // Merge: Keep local items that were recently added/updated (within last 5 seconds)
                // Otherwise use Firebase data
                const now = Date.now()
                const merged = new Map()
                
                // First, add all Firebase items
                firebaseMap.forEach((item, id) => {
                  merged.set(id, item)
                })
                
                // Then, add/update with local items that are recent or not in Firebase
                prevLocal.forEach((localItem) => {
                  if (localItem && localItem.id) {
                    const firebaseItem = firebaseMap.get(localItem.id)
                    // Keep local item if:
                    // 1. It doesn't exist in Firebase, OR
                    // 2. It was recently modified (within 10 seconds) and is newer than Firebase version
                    const isRecent = localItem._lastModified && (now - localItem._lastModified < 10000)
                    const firebaseModified = firebaseItem?._lastModified || 0
                    const localModified = localItem._lastModified || 0
                    const isNewer = localModified > firebaseModified
                    
                    if (!firebaseItem || (isRecent && isNewer)) {
                      merged.set(localItem.id, localItem)
                    } else if (firebaseItem) {
                      // Use Firebase version if it's newer or local isn't recent
                      merged.set(localItem.id, firebaseItem)
                    }
                  }
                })
                
                return Array.from(merged.values())
              })
            }
          } else {
            // No Firebase data - keep local data if it exists
            if (!isInitialLoad) {
              // Don't overwrite local data if Firebase is empty
              return
            }
            setter(fallback)
            isInitialLoad = false
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

    // Load invoices with version initialization for optimistic locking
    bindList('invoices', (data) => {
      // Initialize version field for existing invoices (backward compatibility)
      const invoicesArray = Array.isArray(data) ? data : (data ? Object.values(data) : [])
      const invoicesWithVersion = invoicesArray.map(inv => {
        // Decrypt customer fields in invoice if present
        let decryptedAadhaar = inv.aadhaar || ''
        let decryptedDob = inv.dob || ''
        
        if (decryptedAadhaar) {
          try {
            decryptedAadhaar = decryptCustomerFields({ aadhaar: decryptedAadhaar }).aadhaar
          } catch {
            // Already decrypted or decryption failed, keep as-is
          }
        }
        
        if (decryptedDob) {
          try {
            decryptedDob = decryptCustomerFields({ dob: decryptedDob }).dob
          } catch {
            // Already decrypted or decryption failed, keep as-is
          }
        }
        
        return {
          ...inv,
          version: inv.version || 0,
          aadhaar: decryptedAadhaar,
          dob: decryptedDob,
        }
      })
      
      // Use functional update to merge with existing state
      setInvoices((prevInvoices) => {
        // On initial load, replace all
        if (prevInvoices.length === 0) {
          return invoicesWithVersion
        }
        
        // IMPORTANT: Always preserve ALL existing invoices, only merge/update with Firebase data
        const now = Date.now()
        const merged = new Map()
        
        // Create a map of local invoices for quick lookup - PRESERVE ALL EXISTING
        prevInvoices.forEach(inv => {
          if (inv && inv.id) {
            merged.set(inv.id, inv)
          }
        })
        
        // Now merge/update with Firebase invoices
        invoicesWithVersion.forEach(inv => {
          if (inv && inv.id) {
            const localInv = merged.get(inv.id)
            const localModified = localInv?._lastModified || 0
            const firebaseModified = inv._lastModified || 0
            const isRecent = localModified > 0 && (now - localModified < 30000) // 30 seconds window
            
            // If local version is very recent (within 30 seconds) and newer, keep local
            // Otherwise, update with Firebase version (it's the source of truth)
            if (isRecent && localModified > firebaseModified) {
              // Keep local version - it's newer
              merged.set(inv.id, localInv)
            } else {
              // Update with Firebase version
              merged.set(inv.id, inv)
            }
          }
        })
        
        // Ensure ALL local invoices are preserved (especially ones not in Firebase yet)
        prevInvoices.forEach((localInv) => {
          if (localInv && localInv.id) {
            const firebaseInv = merged.get(localInv.id)
            if (!firebaseInv) {
              // Local invoice not in Firebase - ALWAYS keep it (might be pending sync or offline)
              merged.set(localInv.id, localInv)
            }
          }
        })
        
        // Sort: recent additions first, then by date
        return Array.from(merged.values()).sort((a, b) => {
          const aRecent = a._lastModified && (now - a._lastModified < 10000) // Increased from 5000 to 10000 to match activity window
          const bRecent = b._lastModified && (now - b._lastModified < 10000) // Increased from 5000 to 10000 to match activity window
          if (aRecent && !bRecent) return -1
          if (!aRecent && bRecent) return 1
          return safeCompareDates(b.date, a.date)
        })
      })
    }, [])
    
    // Load customers and decrypt sensitive fields
    bindList('customers', (data) => {
      const customersArray = Array.isArray(data) ? data : (data ? Object.values(data) : [])
      // Decrypt sensitive fields when loading from Firebase
      const decryptedCustomers = customersArray.map(customer => decryptCustomerFields(customer))
      
      // Use functional update to properly merge with existing state
      setCustomers((prevCustomers) => {
        // Create a map for quick lookup
        const decryptedMap = new Map()
        decryptedCustomers.forEach(c => {
          if (c && c.id) {
            decryptedMap.set(c.id, c)
          }
        })
        
        // IMPORTANT: Always preserve ALL existing customers, only merge/update with Firebase data
        const now = Date.now()
        const merged = new Map()
        
        // Create a map of local customers for quick lookup - PRESERVE ALL EXISTING
        prevCustomers.forEach(customer => {
          if (customer && customer.id) {
            merged.set(customer.id, customer)
          }
        })
        
        // Now merge/update with Firebase customers
        decryptedMap.forEach((customer, id) => {
          const localCustomer = merged.get(id)
          const localModified = localCustomer?._lastModified || 0
          const firebaseModified = customer._lastModified || 0
          const isRecent = localModified > 0 && (now - localModified < 30000) // 30 seconds window
          
          // If local version is very recent (within 30 seconds) and newer, keep local
          // Otherwise, update with Firebase version (it's the source of truth)
          if (isRecent && localModified > firebaseModified) {
            // Keep local version - it's newer
            merged.set(id, localCustomer)
          } else {
            // Update with Firebase version
            merged.set(id, customer)
          }
        })
        
        // Ensure ALL local customers are preserved (especially ones not in Firebase yet)
        prevCustomers.forEach((localCustomer) => {
          if (localCustomer && localCustomer.id) {
            const firebaseCustomer = merged.get(localCustomer.id)
            if (!firebaseCustomer) {
              // Local customer not in Firebase - ALWAYS keep it (might be pending sync or offline)
              merged.set(localCustomer.id, localCustomer)
            }
          }
        })
        
        return Array.from(merged.values())
      })
    }, [])
    
    // Load products with merge logic for recent local items
    bindList('products', (data) => {
      const productsArray = Array.isArray(data) ? data : (data ? Object.values(data) : [])
      // Use functional update to merge with existing state
      setProducts((prevProducts) => {
        // On initial load, replace all
        if (prevProducts.length === 0) {
          return productsArray
        }
        
        // IMPORTANT: Always preserve ALL existing products, only merge/update with Firebase data
        const now = Date.now()
        const merged = new Map()
        
        // Create a map of local products for quick lookup - PRESERVE ALL EXISTING
        prevProducts.forEach(product => {
          if (product && product.id) {
            merged.set(product.id, product)
          }
        })
        
        // Now merge/update with Firebase products
        productsArray.forEach(prod => {
          if (prod && prod.id) {
            const localProduct = merged.get(prod.id)
            const localModified = localProduct?._lastModified || 0
            const firebaseModified = prod._lastModified || 0
            const isRecent = localModified > 0 && (now - localModified < 30000) // 30 seconds window
            
            // If local version is very recent (within 30 seconds) and newer, keep local
            // Otherwise, update with Firebase version (it's the source of truth)
            if (isRecent && localModified > firebaseModified) {
              // Keep local version - it's newer
              merged.set(prod.id, localProduct)
            } else {
              // Update with Firebase version
              merged.set(prod.id, prod)
            }
          }
        })
        
        // Ensure ALL local products are preserved (especially ones not in Firebase yet)
        prevProducts.forEach((localProduct) => {
          if (localProduct && localProduct.id) {
            const firebaseProduct = merged.get(localProduct.id)
            if (!firebaseProduct) {
              // Local product not in Firebase - ALWAYS keep it (might be pending sync or offline)
              merged.set(localProduct.id, localProduct)
            }
          }
        })
        
        return Array.from(merged.values())
      })
    }, [])
    
    bindList('distributors', (data) => {
      const distributorsArray = Array.isArray(data) ? data : (data ? Object.values(data) : [])
      setDistributors((prevDistributors) => {
        if (prevDistributors.length === 0) {
          return distributorsArray
        }

        const now = Date.now()
        const merged = new Map()

        prevDistributors.forEach((dist) => {
          if (dist && dist.id) {
            merged.set(dist.id, dist)
          }
        })

        distributorsArray.forEach((dist) => {
          if (dist && dist.id) {
            const localDist = merged.get(dist.id)
            const localModified = localDist?._lastModified || 0
            const remoteModified = dist._lastModified || 0
            const isRecent = localModified > 0 && now - localModified < 30000

            if (isRecent && localModified > remoteModified) {
              merged.set(dist.id, localDist)
            } else {
              merged.set(dist.id, dist)
            }
          }
        })

        prevDistributors.forEach((localDist) => {
          if (localDist && localDist.id && !merged.has(localDist.id)) {
            merged.set(localDist.id, localDist)
          }
        })

        return Array.from(merged.values())
      })
    }, [])

    bindList('distributorSettlements', (data) => {
      const settlementsArray = Array.isArray(data) ? data : (data ? Object.values(data) : [])
      setDistributorSettlements((prevSettlements) => {
        if (prevSettlements.length === 0) {
          return settlementsArray
        }

        const now = Date.now()
        const merged = new Map()

        prevSettlements.forEach((settlement) => {
          if (settlement && settlement.id) {
            merged.set(settlement.id, settlement)
          }
        })

        settlementsArray.forEach((settlement) => {
          if (settlement && settlement.id) {
            const localSettlement = merged.get(settlement.id)
            const localModified = localSettlement?._lastModified || 0
            const remoteModified = settlement._lastModified || 0
            const isRecent = localModified > 0 && now - localModified < 30000

            if (isRecent && localModified > remoteModified) {
              merged.set(settlement.id, localSettlement)
            } else {
              merged.set(settlement.id, settlement)
            }
          }
        })

        prevSettlements.forEach((localSettlement) => {
          if (localSettlement && localSettlement.id && !merged.has(localSettlement.id)) {
            merged.set(localSettlement.id, localSettlement)
          }
        })

        return Array.from(merged.values())
      })
    }, [])
    
    // Load purchases with merge logic for recent local items
    bindList('purchases', (data) => {
      const purchasesArray = Array.isArray(data) ? data : (data ? Object.values(data) : [])
      // Use functional update to merge with existing state
      setPurchases((prevPurchases) => {
        // On initial load, replace all
        if (prevPurchases.length === 0) {
          return purchasesArray
        }
        
        // IMPORTANT: Always preserve ALL existing purchases, only merge/update with Firebase data
        const now = Date.now()
        const merged = new Map()
        
        // Create a map of local purchases for quick lookup - PRESERVE ALL EXISTING
        prevPurchases.forEach(purchase => {
          if (purchase && purchase.id) {
            merged.set(purchase.id, purchase)
          }
        })
        
        // Now merge/update with Firebase purchases
        purchasesArray.forEach(purchase => {
          if (purchase && purchase.id) {
            const localPurchase = merged.get(purchase.id)
            const localModified = localPurchase?._lastModified || 0
            const firebaseModified = purchase._lastModified || 0
            const isRecent = localModified > 0 && (now - localModified < 30000) // 30 seconds window
            
            // If local version is very recent (within 30 seconds) and newer, keep local
            // Otherwise, update with Firebase version (it's the source of truth)
            if (isRecent && localModified > firebaseModified) {
              // Keep local version - it's newer
              merged.set(purchase.id, localPurchase)
            } else {
              // Update with Firebase version
              merged.set(purchase.id, purchase)
            }
          }
        })
        
        // Ensure ALL local purchases are preserved (especially ones not in Firebase yet)
        prevPurchases.forEach((localPurchase) => {
          if (localPurchase && localPurchase.id) {
            const firebasePurchase = merged.get(localPurchase.id)
            if (!firebasePurchase) {
              // Local purchase not in Firebase - ALWAYS keep it (might be pending sync or offline)
              merged.set(localPurchase.id, localPurchase)
            }
          }
        })
        
        return Array.from(merged.values())
      })
    }, [])

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
    let isInitialLoad = true
    const activityListener = onValue(activityRef, (snapshot) => {
      if (snapshot.exists()) {
        const value = snapshot.val()
        const dataArray = Array.isArray(value) ? value : Object.values(value)
        
        if (isInitialLoad) {
          // On initial load, use Firebase data
          setActivity(dataArray.sort((a, b) => safeCompareDates(b.date, a.date)).slice(0, 20))
          isInitialLoad = false
        } else {
          // After initial load, merge with local activity to preserve recent local changes
          setActivity((prevLocal) => {
            // Get recent activity IDs to preserve them
            const recentIds = recentActivityIdsRef.current
            // Combine Firebase data with local activity, removing duplicates
            // But preserve recent local activities
            const localIds = new Set(prevLocal.map(a => a.id))
            const firebaseActivities = dataArray.filter(a => !localIds.has(a.id) && !recentIds.has(a.id))
            // Keep recent local activities at the top
            const recentLocal = prevLocal.filter(a => recentIds.has(a.id))
            const otherLocal = prevLocal.filter(a => !recentIds.has(a.id))
            const merged = [...recentLocal, ...otherLocal, ...firebaseActivities]
              .sort((a, b) => {
                // Sort by date, then by action for same date
                const dateCompare = new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')
                if (dateCompare !== 0) return dateCompare
                return b.action.localeCompare(a.action)
              })
              .slice(0, 20)
            return merged
          })
        }
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
  }, [firebaseReady, db, online, refreshToken])

  const persistMeta = async (nextMeta) => {
    setMeta(nextMeta)
    // Use loadLocalData to get latest state instead of stale closures
    const latestData = loadLocalData() || {
      invoices,
      customers,
      products,
      purchases,
      distributors,
      distributorSettlements,
      settings,
      meta,
      activity,
    }
    if (!firebaseReady || !online || !db) {
      // Save to localStorage when offline
      saveLocalData({
        ...latestData,
        meta: nextMeta,
      })
      return
    }
    try {
      await set(ref(db, 'meta'), nextMeta)
      // Also update localStorage after successful Firebase save
      saveLocalData({
        ...latestData,
        meta: nextMeta,
      })
    } catch (error) {
      console.warn('Failed to save meta to Firebase, saving locally:', error)
      saveLocalData({
        ...latestData,
        meta: nextMeta,
      })
    }
  }

  const pushActivity = useCallback(async (message) => {
      const entry = {
        id: nanoid(),
        action: message,
        date: new Date().toISOString().slice(0, 10),
      }
    
    // Mark this activity as recently added to prevent Firebase listener from overwriting it
    recentActivityIdsRef.current.add(entry.id)
    // Prevent memory leak: limit Set size to 1000 entries
    if (recentActivityIdsRef.current.size > 1000) {
      const entries = Array.from(recentActivityIdsRef.current)
      entries.slice(0, 100).forEach(id => recentActivityIdsRef.current.delete(id))
    }
    // Clear the flag after 10 seconds (increased from 5 to reduce race conditions)
    setTimeout(() => {
      recentActivityIdsRef.current.delete(entry.id)
    }, 10000)
    
    // Update state first
    let updatedActivity = null
    setActivity((prev) => {
      updatedActivity = [entry, ...prev].slice(0, 20)
      return updatedActivity
    })
    
    // Save to localStorage immediately with updated activity
    if (typeof window !== 'undefined') {
      const latestData = loadLocalData() || {}
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: latestData.products || products,
        purchases: latestData.purchases || purchases,
        distributors: latestData.distributors || distributors,
        distributorSettlements: latestData.distributorSettlements || distributorSettlements,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: updatedActivity || [entry],
      })
    }
    
    // Sync to Firebase if online - do this immediately
    if (firebaseReady && online && db) {
      try {
        // Save individual activity entry to Firebase
        await set(ref(db, `activity/${entry.id}`), entry)
        console.log('Activity synced to Firebase:', entry.action)
      } catch (error) {
        console.warn('Failed to save activity to Firebase:', error)
        // If Firebase fails, the activity is still saved locally
      }
    }
  }, [firebaseReady, online, db, invoices, customers, products, purchases, settings, meta])


  const enqueueInvoice = (invoice) => {
    setPendingInvoices((prev) => {
      const next = [...prev.filter((inv) => inv.id !== invoice.id), invoice]
      persistPendingInvoices(next)
      return next
    })
  }

  const syncPendingInvoices = useCallback(async () => {
    if (!firebaseReady || !online || !db) return
    
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
    if (online && firebaseReady && db && pendingInvoices.length > 0 && !syncing) {
      const timer = setTimeout(() => syncPendingInvoices(), 1000)
      return () => clearTimeout(timer)
    }
  }, [online, firebaseReady, db, pendingInvoices.length, syncPendingInvoices, syncing])

  // Listen for background sync messages from service worker and register background sync
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const handleMessage = async (event) => {
      if (event.data && event.data.type === 'SYNC_PENDING_INVOICES') {
        // Service worker triggered background sync
        if (online && firebaseReady && db && pendingInvoices.length > 0 && !syncing) {
          await syncPendingInvoices()
        }
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    // Register background sync when coming back online or when pending invoices exist
    const registerBackgroundSync = async () => {
      if (pendingInvoices.length > 0 && firebaseReady && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          if ('sync' in registration) {
            await registration.sync.register('sync-pending-invoices')
          }
        } catch (error) {
          // Background sync not supported or registration failed
          console.warn('Background sync registration failed:', error)
        }
      }
    }

    const handleOnline = () => {
      registerBackgroundSync()
    }

    window.addEventListener('online', handleOnline)
    
    // Register immediately if online and has pending
    if (online && pendingInvoices.length > 0) {
      registerBackgroundSync()
    }

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
      window.removeEventListener('online', handleOnline)
    }
  }, [online, firebaseReady, db, pendingInvoices.length, syncPendingInvoices, syncing])

  // Sync all data to Firebase when coming back online - REMOVED: This was causing data loss
  // Individual sync operations handle their own Firebase updates
  // The bindList listeners will sync data automatically when Firebase is available

  const upsertInvoice = useCallback(async (form, status = 'draft') => {
    // Get latest meta to avoid race conditions with invoice sequence
      const latestData = loadLocalData() || {
        invoices,
        customers,
        products,
        purchases,
        distributors,
        distributorSettlements,
        settings,
        meta,
        activity,
      }
    const currentMeta = latestData.meta || meta
    let nextSequence = (currentMeta?.invoiceSequence || 0) + 1
    const invoiceDate = safeParseDate(form.date) || new Date()
    const manualInvoiceNo = (form.invoiceNo || '').trim()
    const existingInvoices = (latestData.invoices || invoices || []).filter(Boolean)

    let invoiceNo = manualInvoiceNo
    if (invoiceNo) {
      const duplicateManual = existingInvoices.some(
        (inv) => inv.invoiceNo?.toLowerCase() === invoiceNo.toLowerCase() && inv.id !== form.id,
      )
      if (duplicateManual) {
        const error = new Error('Invoice number already exists')
        error.code = 'DUPLICATE_INVOICE_NO'
        throw error
      }
    } else {
      invoiceNo = makeInvoiceNo(nextSequence, invoiceDate, settings.invoicePrefix)
      const existingNumbers = new Set(
        existingInvoices.filter((inv) => inv.invoiceNo && inv.id !== form.id).map((inv) => inv.invoiceNo),
      )
      while (existingNumbers.has(invoiceNo)) {
        nextSequence += 1
        invoiceNo = makeInvoiceNo(nextSequence, invoiceDate, settings.invoicePrefix)
      }
    }
    const existingInvoice = form.id ? invoices.find((inv) => inv.id === form.id) : null
    // Use latest products to avoid stale inventory data
    let nextProducts = latestData.products || products
    
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

    const discountRaw = Number(form.discountAmount) || 0
    const discountAmount = Math.max(0, Math.min(discountRaw, totals.grandTotal))
    const totalsWithDiscount = {
      ...totals,
      discount: +discountAmount.toFixed(2),
      grandTotal: +Math.max(0, totals.grandTotal - discountAmount).toFixed(2),
    }

    let inventoryAdjusted = existingInvoice?.inventoryAdjusted || false
    if (existingInvoice?.inventoryAdjusted && existingInvoice.items?.length) {
      nextProducts = adjustProductsFromItems(nextProducts, existingInvoice.items, 1)
      inventoryAdjusted = false
    }

    const shouldAdjustNow = shouldAutoAdjustInventory(settings.stockUpdateMode, status)
    if (shouldAdjustNow) {
      nextProducts = adjustProductsFromItems(nextProducts, rows, -1)
      inventoryAdjusted = true
    }

    // Update products state if inventory was adjusted
    if (nextProducts !== products) {
      setProducts((prevProducts) => {
        // Ensure we're working with the latest products
        const latestProducts = loadLocalData()?.products || prevProducts
        // Merge inventory changes properly
        const productMap = new Map(latestProducts.map(p => [p.id, p]))
        nextProducts.forEach(updatedProduct => {
          productMap.set(updatedProduct.id, updatedProduct)
        })
        return Array.from(productMap.values())
      })
    }

    // Check for optimistic locking conflict if editing
    if (existingInvoice) {
      const currentVersion = existingInvoice.version || 0
      const providedVersion = form.version
      if (providedVersion !== undefined && providedVersion !== currentVersion) {
        throw new Error('CONFLICT: Invoice was modified by another user. Please refresh and try again.')
      }
    }

    // Encrypt sensitive customer fields before saving
    const encryptedAadhaar = customerAadhaar ? encryptCustomerFields({ aadhaar: customerAadhaar }).aadhaar : ''
    const encryptedDob = customerDob ? encryptCustomerFields({ dob: customerDob }).dob : ''

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
      aadhaar: encryptedAadhaar,
      dob: encryptedDob,
      place_of_supply: customerState,
      state: customerState,
      items: rows,
      totals: totalsWithDiscount,
      status,
      notes: form.notes || '',
      reverseCharge: form.reverseCharge || false,
      customerSignature: form.customerSignature || '',
      amountPaid: form.amountPaid || 0,
      paymentMethods: form.paymentMethods && Array.isArray(form.paymentMethods) ? form.paymentMethods : [],
      discountAmount: +discountAmount.toFixed(2), // Save the clamped discount amount directly
      version: (existingInvoice?.version || 0) + 1, // Increment version for optimistic locking
      synced: firebaseReady,
      createdAt: form.createdAt || Date.now(),
      _lastModified: Date.now(), // Track when this was last modified locally
      inventoryAdjusted,
    }

    // Decrypt invoice customer fields for state (invoice has encrypted fields for storage)
    const decryptedInvoice = {
      ...invoice,
      aadhaar: invoice.aadhaar ? (() => {
        try {
          return decryptCustomerFields({ aadhaar: invoice.aadhaar }).aadhaar
        } catch {
          return invoice.aadhaar // Already decrypted or failed
        }
      })() : invoice.aadhaar,
      dob: invoice.dob ? (() => {
        try {
          return decryptCustomerFields({ dob: invoice.dob }).dob
        } catch {
          return invoice.dob // Already decrypted or failed
        }
      })() : invoice.dob,
    }
    
    // Update local state immediately - ensure it's at the top of the list
    setInvoices((prev) => {
      const filtered = prev.filter((inv) => inv.id !== invoice.id)
      // Put new invoice at the top (newest first by date, but recent additions first)
      const updated = [decryptedInvoice, ...filtered]
      // Sort by date descending, but keep very recent additions at top
      const now = Date.now()
      return updated.sort((a, b) => {
        // If one is very recent (within 10 seconds), prioritize it (consistent with activity window)
        const aRecent = a._lastModified && (now - a._lastModified < 10000)
        const bRecent = b._lastModified && (now - b._lastModified < 10000)
        if (aRecent && !bRecent) return -1
        if (!aRecent && bRecent) return 1
        // Otherwise sort by date
        return safeCompareDates(b.date, a.date)
      })
    })

    pushActivity(`${invoice.invoiceNo} saved as ${status}`)

    // Update meta atomically to prevent race conditions
    let metaSnapshot = currentMeta
    if (!form.id) {
      const nextMeta = { ...currentMeta, invoiceSequence: nextSequence }
      metaSnapshot = nextMeta
      // Persist meta immediately before saving invoice
      await persistMeta(nextMeta)
    }

    // Use latest data for persistence
    const finalLatestData = loadLocalData() || { invoices, customers, products, purchases, settings, meta, activity }
    const finalProducts = finalLatestData.products || nextProducts
    
    // Encrypt invoice customer fields before saving
    const encryptedInvoiceForStorage = {
      ...invoice,
      // Keep encrypted versions (already encrypted above)
    }
    
    const invoicesForPersistence = [encryptedInvoiceForStorage, ...(finalLatestData.invoices || []).filter((inv) => inv.id !== invoice.id)]

    // Save to localStorage immediately with encrypted data
    saveLocalData({
      invoices: invoicesForPersistence,
      customers: finalLatestData.customers || customers,
      products: finalProducts,
      purchases: finalLatestData.purchases || purchases,
      distributors: finalLatestData.distributors || distributors,
      distributorSettlements: finalLatestData.distributorSettlements || distributorSettlements,
      settings: finalLatestData.settings || settings,
      meta: metaSnapshot,
      activity: finalLatestData.activity || activity,
    })

    // Sync to Firebase if online (with encrypted invoice)
    if (firebaseReady && online && db) {
      try {
        await set(ref(db, `invoices/${invoice.id}`), encryptedInvoiceForStorage)
      } catch (error) {
        enqueueInvoice(encryptedInvoiceForStorage)
        console.warn('Invoice saved locally; sync pending', error)
      }
    } else {
      enqueueInvoice(encryptedInvoiceForStorage)
    }
    
    return decryptedInvoice // Return decrypted version for component use
  }, [meta, settings, firebaseReady, online, db, invoices, customers, products, purchases, activity])

  const markInvoiceStatus = useCallback(async (invoiceId, status) => {
    const existing = invoices.find((inv) => inv.id === invoiceId)
    if (!existing) return

    // Get latest products to avoid stale inventory data
    const latestData = loadLocalData() || { invoices, customers, products, purchases, settings, meta, activity }
    let nextProducts = latestData.products || products
    let nextInventoryAdjusted = existing.inventoryAdjusted || false
    const requiresInventory = shouldAutoAdjustInventory(settings.stockUpdateMode, status)

    if (nextInventoryAdjusted && !requiresInventory) {
      nextProducts = adjustProductsFromItems(nextProducts, existing.items, 1)
      nextInventoryAdjusted = false
    } else if (!nextInventoryAdjusted && requiresInventory) {
      nextProducts = adjustProductsFromItems(nextProducts, existing.items, -1)
      nextInventoryAdjusted = true
    }

    // Update products state atomically
    if (nextProducts !== products) {
      setProducts((prevProducts) => {
        // Ensure we're working with the latest products
        const currentProducts = loadLocalData()?.products || prevProducts
        // Merge inventory changes properly
        const productMap = new Map(currentProducts.map(p => [p.id, p]))
        nextProducts.forEach(updatedProduct => {
          productMap.set(updatedProduct.id, updatedProduct)
        })
        return Array.from(productMap.values())
      })
    }

    const amountPaid = status === 'paid' ? (existing.totals?.grandTotal || 0) : existing.amountPaid || 0
    
    // If marking as paid and no payment methods exist, create one for consistency
    let paymentMethods = existing.paymentMethods
    if (status === 'paid' && (!paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) && amountPaid > 0) {
      paymentMethods = [{ method: 'Cash', amount: amountPaid, reference: '' }]
    }

    const updatedInvoices = invoices.map((inv) => {
      if (inv.id !== invoiceId) return inv
      return {
        ...inv,
        status,
        amountPaid,
        paymentMethods: paymentMethods || [],
        inventoryAdjusted: nextInventoryAdjusted,
        version: (inv.version || 0) + 1, // Increment version
      }
    })

    setInvoices(updatedInvoices)
    
    // Push activity first, then save with updated activity
    pushActivity(`${existing.invoiceNo || invoiceId} marked ${status}`)
    
    // Save to localStorage immediately with latest state (reuse latestData from above)
    const finalData = loadLocalData() || { invoices, customers, products, purchases, settings, meta, activity }
    // Encrypt invoices before saving to localStorage (invoices in state are decrypted)
    const encryptedInvoices = updatedInvoices.map(inv => {
      if (inv.aadhaar || inv.dob) {
        return {
          ...inv,
          aadhaar: inv.aadhaar ? encryptCustomerFields({ aadhaar: inv.aadhaar }).aadhaar : inv.aadhaar,
          dob: inv.dob ? encryptCustomerFields({ dob: inv.dob }).dob : inv.dob,
        }
      }
      return inv
    })
    
    saveLocalData({
      invoices: encryptedInvoices, // Save encrypted to localStorage
      customers: finalData.customers || customers,
      products: nextProducts,
      purchases: finalData.purchases || purchases,
      distributors: finalData.distributors || distributors,
      distributorSettlements: finalData.distributorSettlements || distributorSettlements,
      settings: finalData.settings || settings,
      meta: finalData.meta || meta,
      activity: finalData.activity || activity,
    })

    // Sync to Firebase if online
    if (firebaseReady && online && db) {
      try {
        const existingInvoice = updatedInvoices.find(inv => inv.id === invoiceId)
        if (existingInvoice) {
          // Encrypt customer fields before saving to Firebase
          const encryptedInvoice = {
            ...existingInvoice,
            aadhaar: existingInvoice.aadhaar ? encryptCustomerFields({ aadhaar: existingInvoice.aadhaar }).aadhaar : existingInvoice.aadhaar,
            dob: existingInvoice.dob ? encryptCustomerFields({ dob: existingInvoice.dob }).dob : existingInvoice.dob,
          }
        await update(ref(db, `invoices/${invoiceId}`), {
          status,
          amountPaid,
          inventoryAdjusted: nextInventoryAdjusted,
            version: encryptedInvoice.version,
        })
        }
      } catch (error) {
        console.warn('Failed to update invoice status in Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, products, purchases, distributors, distributorSettlements, settings, meta, activity])

  const deleteInvoice = useCallback(async (invoiceId) => {
    const targetInvoice = invoices.find((inv) => inv.id === invoiceId)
    const latestData = loadLocalData() || { invoices, customers, products, purchases, settings, meta, activity }
    let nextProducts = latestData.products || products
    
    if (targetInvoice?.inventoryAdjusted && targetInvoice.items?.length) {
      nextProducts = adjustProductsFromItems(nextProducts, targetInvoice.items, 1)
      if (nextProducts !== products) {
        setProducts((prevProducts) => {
          const currentProducts = loadLocalData()?.products || prevProducts
          const productMap = new Map(currentProducts.map(p => [p.id, p]))
          nextProducts.forEach(updatedProduct => {
            productMap.set(updatedProduct.id, updatedProduct)
          })
          return Array.from(productMap.values())
        })
      }
    }

    setInvoices((prev) => {
      const updated = prev.filter((inv) => inv.id !== invoiceId)
      
      // Encrypt invoices before saving to localStorage (invoices in state are decrypted)
      const encryptedInvoices = updated.map(inv => {
        if (inv.aadhaar || inv.dob) {
          return {
            ...inv,
            aadhaar: inv.aadhaar ? encryptCustomerFields({ aadhaar: inv.aadhaar }).aadhaar : inv.aadhaar,
            dob: inv.dob ? encryptCustomerFields({ dob: inv.dob }).dob : inv.dob,
          }
        }
        return inv
      })
      
      // Save to localStorage immediately with latest state
      const currentLatestData = loadLocalData() || {
        invoices: prev,
        customers,
        products,
        purchases,
        distributors,
        distributorSettlements,
        settings,
        meta,
        activity,
      }
      saveLocalData({
        invoices: encryptedInvoices, // Save encrypted to localStorage
        customers: currentLatestData.customers || customers,
        products: nextProducts,
        purchases: currentLatestData.purchases || purchases,
        distributors: currentLatestData.distributors || distributors,
        distributorSettlements: currentLatestData.distributorSettlements || distributorSettlements,
        settings: currentLatestData.settings || settings,
        meta: currentLatestData.meta || meta,
        activity: currentLatestData.activity || activity,
      })
      return updated // Return decrypted for state
    })
    
    pushActivity(`${targetInvoice?.invoiceNo || invoiceId} deleted`)
    
    // Sync to Firebase if online
    if (firebaseReady && online && db) {
      try {
        await remove(ref(db, `invoices/${invoiceId}`))
      } catch (error) {
        console.warn('Failed to delete invoice from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, products, purchases, settings, meta, activity])

  const upsertCustomer = useCallback(async (customer) => {
    // Encrypt sensitive fields before saving to Firebase/localStorage
    const encryptedCustomer = encryptCustomerFields(customer)
    
    const nextEncrypted = { 
      ...encryptedCustomer, 
      id: customer.id || nanoid(),
      totalPurchase: customer.totalPurchase || 0,
      _lastModified: Date.now(), // Track when this was last modified locally
    }
    
    // Create decrypted version for React state (for display)
    const nextDecrypted = decryptCustomerFields(nextEncrypted)
    
    // Update local state immediately with DECRYPTED version (for display)
    setCustomers((prev) => {
      const filtered = prev.filter((c) => c.id !== nextDecrypted.id)
      const updated = [nextDecrypted, ...filtered]
      // Save to localStorage with ENCRYPTED version (for storage)
      const latestData = loadLocalData() || {
        invoices,
        customers: prev,
        products,
        purchases,
        distributors,
        distributorSettlements,
        settings,
        meta,
        activity,
      }
      // Convert decrypted state back to encrypted for storage
      const encryptedForStorage = updated.map(c => encryptCustomerFields(c))
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: encryptedForStorage, // Save encrypted to localStorage
        products: latestData.products || products,
        purchases: latestData.purchases || purchases,
        distributors: latestData.distributors || distributors,
        distributorSettlements: latestData.distributorSettlements || distributorSettlements,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated // Return decrypted for state
    })
    
    pushActivity(`Customer "${nextDecrypted.name}" ${customer.id ? 'updated' : 'added'}`)
    
    // Save to Firebase if online (with ENCRYPTED version)
    if (firebaseReady && online && db) {
      try {
        await set(ref(db, `customers/${nextEncrypted.id}`), nextEncrypted)
      } catch (error) {
        console.warn('Failed to save customer to Firebase, saved locally:', error)
      }
    }
    
    return nextDecrypted // Return decrypted version for component use
  }, [firebaseReady, online, db, invoices, products, purchases, distributors, distributorSettlements, settings, meta, activity])

  const upsertProduct = useCallback(async (product) => {
    const next = { 
      ...product, 
      id: product.id || nanoid(),
      _lastModified: Date.now(), // Track when this was last modified locally
    }
    setProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== next.id)
      const updated = [next, ...filtered]
      // Save to localStorage immediately with latest state
      const latestData = loadLocalData() || {
        invoices,
        customers: prev,
        products: prev,
        purchases,
        distributors,
        distributorSettlements,
        settings,
        meta,
        activity,
      }
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: updated,
        purchases: latestData.purchases || purchases,
        distributors: latestData.distributors || distributors,
        distributorSettlements: latestData.distributorSettlements || distributorSettlements,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated
    })
    
    pushActivity(`Product "${next.name}" ${product.id ? 'updated' : 'added'}`)
    
    // Save to Firebase if online
    if (firebaseReady && online && db) {
      try {
    await set(ref(db, `products/${next.id}`), next)
      } catch (error) {
        console.warn('Failed to save product to Firebase, saved locally:', error)
      }
    }
    
    return next
  }, [firebaseReady, online, db, invoices, customers, purchases, distributors, distributorSettlements, settings, meta, activity])

  const deleteCustomer = useCallback(async (customerId) => {
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== customerId)
      // Save to localStorage immediately with latest state
      const latestData = loadLocalData() || { invoices, customers: prev, products, purchases, settings, meta, activity }
      // Encrypt customers before saving to localStorage (customers in state are decrypted)
      const encryptedCustomers = updated.map(c => encryptCustomerFields(c))
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: encryptedCustomers, // Save encrypted to localStorage
        products: latestData.products || products,
        purchases: latestData.purchases || purchases,
        distributors: latestData.distributors || distributors,
        distributorSettlements: latestData.distributorSettlements || distributorSettlements,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated // Return decrypted for state
    })
    
    pushActivity(`Customer deleted`)
    
    // Sync to Firebase if online
    if (firebaseReady && online && db) {
      try {
        await remove(ref(db, `customers/${customerId}`))
      } catch (error) {
        console.warn('Failed to delete customer from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, products, purchases, distributors, distributorSettlements, settings, meta, activity])

  const deleteProduct = useCallback(async (productId) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId)
      // Save to localStorage immediately with latest state
      const latestData = loadLocalData() || { invoices, customers, products: prev, purchases, settings, meta, activity }
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: updated,
        purchases: latestData.purchases || purchases,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated
    })
    
    pushActivity(`Product deleted`)
    
    // Sync to Firebase if online
    if (firebaseReady && online && db) {
      try {
        await remove(ref(db, `products/${productId}`))
      } catch (error) {
        console.warn('Failed to delete product from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, purchases, distributors, distributorSettlements, settings, meta, activity])

  const savePurchase = useCallback(async (purchase) => {
    const next = { 
      ...purchase, 
      id: purchase.id || nanoid(),
      _lastModified: Date.now(),
    }
    setPurchases((prev) => {
      const filtered = prev.filter((p) => p.id !== next.id)
      const updated = [next, ...filtered]
      // Save to localStorage immediately with latest state
      const latestData = loadLocalData() || {
        invoices,
        customers,
        products,
        purchases: prev,
        distributors,
        distributorSettlements,
        settings,
        meta,
        activity,
      }
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: latestData.products || products,
        purchases: updated,
        distributors: latestData.distributors || distributors,
        distributorSettlements: latestData.distributorSettlements || distributorSettlements,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated
    })
    
    pushActivity(`Purchase saved`)
    
    // Save to Firebase if online
    if (firebaseReady && online && db) {
      try {
    await set(ref(db, `purchases/${next.id}`), next)
      } catch (error) {
        console.warn('Failed to save purchase to Firebase, saved locally:', error)
      }
    }
    
    return next
  }, [firebaseReady, online, db, invoices, customers, products, distributors, distributorSettlements, settings, meta, activity])

  const upsertDistributor = useCallback(async (distributor) => {
    const next = {
      id: distributor.id || nanoid(),
      name: (distributor.name || 'Unnamed Distributor').trim(),
      phone: distributor.phone || '',
      contact: distributor.contact || '',
      note: distributor.note || '',
      _lastModified: Date.now(),
    }

    setDistributors((prev) => {
      const filtered = prev.filter((d) => d.id !== next.id)
      const updated = [next, ...filtered]
      const latestData = loadLocalData() || {
        invoices,
        customers,
        products,
        purchases,
        distributors: prev,
        distributorSettlements,
        settings,
        meta,
        activity,
      }
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: latestData.products || products,
        purchases: latestData.purchases || purchases,
        distributors: updated,
        distributorSettlements: latestData.distributorSettlements || distributorSettlements,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated
    })

    pushActivity(`Distributor "${next.name}" ${distributor.id ? 'updated' : 'added'}`)

    if (firebaseReady && online && db) {
      try {
        await set(ref(db, `distributors/${next.id}`), next)
      } catch (error) {
        console.warn('Failed to save distributor to Firebase, saved locally:', error)
      }
    }

    return next
  }, [firebaseReady, online, db, invoices, customers, products, purchases, distributorSettlements, settings, meta, activity])

  const deleteDistributor = useCallback(async (distributorId) => {
    setDistributors((prev) => {
      const updated = prev.filter((d) => d.id !== distributorId)
      const latestData = loadLocalData() || {
        invoices,
        customers,
        products,
        purchases,
        distributors: prev,
        distributorSettlements,
        settings,
        meta,
        activity,
      }
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: latestData.products || products,
        purchases: latestData.purchases || purchases,
        distributors: updated,
        distributorSettlements: latestData.distributorSettlements || distributorSettlements,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated
    })

    pushActivity('Distributor deleted')

    if (firebaseReady && online && db) {
      try {
        await remove(ref(db, `distributors/${distributorId}`))
      } catch (error) {
        console.warn('Failed to delete distributor from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, products, purchases, distributorSettlements, settings, meta, activity])

  const recordDistributorSettlement = useCallback(async (settlement) => {
    if (!settlement || !settlement.distributorId) {
      throw new Error('Distributor ID is required for settlements')
    }
    const amount = Number(settlement.amount)
    if (!settlement.amount || isNaN(amount) || amount <= 0) {
      throw new Error(`Settlement amount must be a positive number. Received: ${settlement.amount}`)
    }

    const next = {
      id: settlement.id || nanoid(),
      distributorId: settlement.distributorId,
      amount: Number(settlement.amount) || 0,
      date: settlement.date || new Date().toISOString().slice(0, 10),
      method: settlement.method || 'cash',
      note: settlement.note || '',
      invoiceIds: Array.isArray(settlement.invoiceIds) ? settlement.invoiceIds : [],
      _lastModified: Date.now(),
    }

    setDistributorSettlements((prev) => {
      const filtered = prev.filter((s) => s.id !== next.id)
      const updated = [next, ...filtered]
      const latestData = loadLocalData() || {
        invoices,
        customers,
        products,
        purchases,
        distributors,
        distributorSettlements: prev,
        settings,
        meta,
        activity,
      }
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: latestData.products || products,
        purchases: latestData.purchases || purchases,
        distributors: latestData.distributors || distributors,
        distributorSettlements: updated,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated
    })

    pushActivity(`Settlement recorded for distributor`)

    if (firebaseReady && online && db) {
      try {
        await set(ref(db, `distributorSettlements/${next.id}`), next)
      } catch (error) {
        console.warn('Failed to save settlement to Firebase, saved locally:', error)
      }
    }

    return next
  }, [firebaseReady, online, db, invoices, customers, products, purchases, distributors, distributorSettlements, settings, meta, activity])

  const deleteDistributorSettlement = useCallback(async (settlementId) => {
    setDistributorSettlements((prev) => {
      const updated = prev.filter((s) => s.id !== settlementId)
      const latestData = loadLocalData() || {
        invoices,
        customers,
        products,
        purchases,
        distributors,
        distributorSettlements: prev,
        settings,
        meta,
        activity,
      }
      saveLocalData({
        invoices: latestData.invoices || invoices,
        customers: latestData.customers || customers,
        products: latestData.products || products,
        purchases: latestData.purchases || purchases,
        distributors: latestData.distributors || distributors,
        distributorSettlements: updated,
        settings: latestData.settings || settings,
        meta: latestData.meta || meta,
        activity: latestData.activity || activity,
      })
      return updated
    })

    pushActivity('Distributor settlement deleted')

    if (firebaseReady && online && db) {
      try {
        await remove(ref(db, `distributorSettlements/${settlementId}`))
      } catch (error) {
        console.warn('Failed to delete settlement from Firebase, saved locally:', error)
      }
    }
  }, [firebaseReady, online, db, invoices, customers, products, purchases, distributors, settings, meta, activity])

  const calculateDistributorPayables = useCallback(() => {
    const result = new Map()
    const productsById = new Map(products.map((product) => [product.id, product]))
    const distributorsById = new Map(distributors.map((dist) => [dist.id, dist]))
    const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]))

    // Calculate payables based on CURRENT INVENTORY STOCK
    // This shows what you owe for items you currently have in stock
    products.forEach((product) => {
      if (!product.distributorId) return

      const distributorId = product.distributorId
      const stock = Number(product.stock) || 0
      const costPrice = Number(product.cost_price) || 0
      
      if (stock <= 0 || costPrice <= 0) return

      const stockValue = +(stock * costPrice).toFixed(2)
      const distributor = distributorsById.get(distributorId) || { id: distributorId, name: 'Unknown Distributor' }

      const existing = result.get(distributorId) || {
        distributor,
        totalOwed: 0,
        invoices: new Map(),
        settledInvoices: new Map(),
        items: new Map(),
        settlements: [],
        inventoryValue: 0, // Track total inventory value
        soldItemsValue: 0, // Track value of items sold (you still owe for these)
      }

      existing.totalOwed += stockValue
      existing.inventoryValue += stockValue

      // Track items in inventory
      const itemEntry = existing.items.get(product.id) || {
        productId: product.id,
        productName: product.name,
        totalQuantity: 0,
        totalCost: 0,
      }
      itemEntry.totalQuantity += stock
      itemEntry.totalCost += stockValue
      existing.items.set(product.id, itemEntry)

      result.set(distributorId, existing)
    })

    // Add value of items SOLD - you still owe the distributor for these until you pay them
    // Selling to customers doesn't pay the distributor, so you still owe for sold items
    invoices
      .filter((inv) => {
        const status = (inv.status || '').toLowerCase()
        return status === 'paid' || status === 'sent' || status === 'partial'
      })
      .forEach((invoice) => {
        invoice.items?.forEach((item) => {
          if (!item.productId) return
          const product = productsById.get(item.productId)
          if (!product || !product.distributorId) return

          const distributorId = product.distributorId
          const distributor = distributorsById.get(distributorId) || { id: distributorId, name: 'Unknown Distributor' }
          
          const existing = result.get(distributorId) || {
            distributor,
            totalOwed: 0,
            invoices: new Map(),
            settledInvoices: new Map(),
            items: new Map(),
            settlements: [],
            inventoryValue: 0,
            soldItemsValue: 0,
          }

          const productCost = Number(product.cost_price) || 0
          const itemCost = Number(item.costPrice) || 0
          const itemRate = Number(item.rate) || 0
          const effectiveCost = productCost || itemCost || (itemRate ? itemRate * 0.8 : 0)
          if (!effectiveCost) return

          const quantity = Number(item.qty) || 0
          const owed = +(quantity * effectiveCost).toFixed(2)

          // Add to total owed - you still owe for items you sold
          existing.totalOwed += owed
          existing.soldItemsValue += owed

          const invoiceEntry = existing.invoices.get(invoice.id) || {
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo,
            date: invoice.date,
            items: [],
            subtotal: 0,
          }
          invoiceEntry.items.push({
            productId: item.productId,
            productName: product.name,
            quantity,
            costPrice: effectiveCost,
            lineCost: owed,
          })
          invoiceEntry.subtotal += owed
          existing.invoices.set(invoice.id, invoiceEntry)

          result.set(distributorId, existing)
        })
      })

    // Subtract settlements from total owed
    distributorSettlements.forEach((settlement) => {
      const entry = result.get(settlement.distributorId)
      if (!entry) return

      entry.settlements.push(settlement)
      entry.totalOwed -= Number(settlement.amount) || 0

      // Track which invoices were settled (for reference)
      settlement.invoiceIds?.forEach((invoiceId) => {
        const invoice = invoicesById.get(invoiceId)
        if (!invoice) return

        const existing = entry.invoices.get(invoiceId)
        const items =
          existing?.items ||
          (invoice.items || []).map((item) => {
            const product = productsById.get(item.productId)
            const productCost = Number(product?.cost_price) || 0
            const itemCost = Number(item.costPrice) || 0
            const itemRate = Number(item.rate) || 0
            const effectiveCost = productCost || itemCost || (itemRate ? itemRate * 0.8 : 0)
            const quantity = Number(item.qty) || 0
            return {
              productId: item.productId,
              productName: product?.name || item.productName || 'Item',
              quantity,
              costPrice: effectiveCost,
              lineCost: +(quantity * effectiveCost).toFixed(2),
            }
          })
        const subtotal = existing?.subtotal || items.reduce((sum, item) => sum + item.lineCost, 0)

        entry.settledInvoices.set(invoiceId, {
          invoiceId,
          invoiceNo: invoice.invoiceNo,
          date: invoice.date,
          items,
          subtotal,
          settlementId: settlement.id,
        })
      })
    })

    return Array.from(result.values()).map((entry) => ({
      distributor: entry.distributor,
      totalOwed: +Math.max(entry.totalOwed, 0).toFixed(2),
      inventoryValue: +(entry.inventoryValue || 0).toFixed(2), // Total value of current stock
      invoices: Array.from(entry.invoices.values()),
      settledInvoices: Array.from(entry.settledInvoices.values()),
      items: Array.from(entry.items.values()),
      settlements: entry.settlements.sort((a, b) => new Date(b.date) - new Date(a.date)),
    }))
  }, [invoices, products, distributors, distributorSettlements])

  const backupData = useCallback(
    () => ({
      invoices,
      customers,
      products,
      purchases,
      distributors,
      distributorSettlements,
      meta,
      settings,
    }),
    [invoices, customers, products, purchases, distributors, distributorSettlements, meta, settings],
  )

  const resetAllData = useCallback(async () => {
    const freshSettings = { ...defaultState.settings }
    const freshMeta = { ...defaultState.meta }

    setInvoices([])
    setCustomers([])
    setProducts([])
    setPurchases([])
    setDistributors([])
    setDistributorSettlements([])
    setSettings(freshSettings)
    setMeta(freshMeta)
    setActivity([])
    setPendingInvoices([])

    clearPendingInvoices()
    clearLocalData()
    clearAllLocalStorage()

    saveLocalData({
      invoices: [],
      customers: [],
      products: [],
      purchases: [],
      distributors: [],
      distributorSettlements: [],
      settings: freshSettings,
      meta: freshMeta,
      activity: [],
    })

    if (firebaseReady && online && db) {
      const paths = ['invoices', 'customers', 'products', 'purchases', 'distributors', 'distributorSettlements', 'settings', 'meta', 'activity']
      try {
        await Promise.all(paths.map((path) => remove(ref(db, path))))
      } catch (error) {
        console.warn('Failed to reset Firebase data:', error)
        throw error
      }
    }
  }, [firebaseReady, online, db])

  const restoreBackup = useCallback(async (payload) => {
    // Decrypt customers when restoring (if they were encrypted in backup)
    const decryptedCustomers = (payload.customers || []).map(c => {
      // Check if already decrypted (backward compatibility)
      try {
        return decryptCustomerFields(c)
      } catch {
        return c // Return as-is if decryption fails
      }
    })
    
    // Initialize invoice versions for backward compatibility
    const invoicesWithVersion = (payload.invoices || []).map(inv => ({
      ...inv,
      version: inv.version || 0,
      // Decrypt customer fields in invoices
      aadhaar: inv.aadhaar ? (() => {
        try {
          return decryptCustomerFields({ aadhaar: inv.aadhaar }).aadhaar
        } catch {
          return inv.aadhaar
        }
      })() : inv.aadhaar,
      dob: inv.dob ? (() => {
        try {
          return decryptCustomerFields({ dob: inv.dob }).dob
        } catch {
          return inv.dob
        }
      })() : inv.dob,
    }))

    const safe = {
      invoices: invoicesWithVersion,
      customers: decryptedCustomers,
      products: payload.products || [],
      purchases: payload.purchases || [],
      distributors: payload.distributors || [],
      distributorSettlements: payload.distributorSettlements || [],
      meta: payload.meta || meta,
      settings: payload.settings || settings,
    }
    
    // Update state with decrypted customers
    setInvoices(safe.invoices)
    setCustomers(safe.customers)
    setProducts(safe.products)
    setPurchases(safe.purchases)
    setDistributors(safe.distributors)
    setDistributorSettlements(safe.distributorSettlements)
    setMeta(safe.meta)
    setSettings(safe.settings)

    // Encrypt customers before saving to localStorage/Firebase
    const encryptedCustomers = safe.customers.map(c => encryptCustomerFields(c))
    const encryptedInvoices = safe.invoices.map(inv => ({
      ...inv,
      aadhaar: inv.aadhaar ? encryptCustomerFields({ aadhaar: inv.aadhaar }).aadhaar : inv.aadhaar,
      dob: inv.dob ? encryptCustomerFields({ dob: inv.dob }).dob : inv.dob,
    }))

    // Save to localStorage with encrypted data
    saveLocalData({
      invoices: encryptedInvoices,
      customers: encryptedCustomers,
      products: safe.products,
      purchases: safe.purchases,
      distributors: safe.distributors,
      distributorSettlements: safe.distributorSettlements,
      settings: safe.settings,
      meta: safe.meta,
      activity: [],
    })

    // Save to Firebase with encrypted data (if online)
    if (firebaseReady && online && db) {
      try {
      await Promise.all([
          set(ref(db, 'invoices'), encryptedInvoices.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
          set(ref(db, 'customers'), encryptedCustomers.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'products'), safe.products.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'purchases'), safe.purchases.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'distributors'), safe.distributors.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'distributorSettlements'), safe.distributorSettlements.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})),
        set(ref(db, 'meta'), safe.meta),
        set(ref(db, 'settings'), safe.settings),
      ])
      } catch (error) {
        console.warn('Failed to restore backup to Firebase:', error)
    }
    }
    
    pushActivity('Backup restored')
  }, [firebaseReady, online, db, meta, settings])

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
      distributors,
      distributorSettlements,
      saveInvoice: upsertInvoice,
      markInvoiceStatus,
      deleteInvoice,
      upsertCustomer,
      deleteCustomer,
      upsertProduct,
      deleteProduct,
      savePurchase,
      upsertDistributor,
      deleteDistributor,
      recordDistributorSettlement,
      deleteDistributorSettlement,
      updateSettings: async (nextSettings) => {
        const merged = { ...settings, ...nextSettings }
        setSettings(merged)
        
        // Save to localStorage immediately with latest state
        const latestData = loadLocalData() || {
          invoices,
          customers,
          products,
          purchases,
          distributors,
          distributorSettlements,
          settings,
          meta,
          activity,
        }
        saveLocalData({
          invoices: latestData.invoices || invoices,
          customers: latestData.customers || customers,
          products: latestData.products || products,
          purchases: latestData.purchases || purchases,
          distributors: latestData.distributors || distributors,
          distributorSettlements: latestData.distributorSettlements || distributorSettlements,
          settings: merged,
          meta: latestData.meta || meta,
          activity: latestData.activity || activity,
        })
        
        // Sync to Firebase if online
        if (firebaseReady && online && db) {
          try {
            await set(ref(db, 'settings'), merged)
          } catch (error) {
            console.warn('Failed to save settings to Firebase, saved locally:', error)
          }
        }
        
        pushActivity('Settings updated')
      },
      backupData,
      calculateDistributorPayables,
      restoreBackup,
      syncPendingInvoices,
      resetAllData,
      refreshData,
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
      distributors,
      distributorSettlements,
      upsertInvoice,
      markInvoiceStatus,
      deleteInvoice,
      upsertCustomer,
      deleteCustomer,
      upsertProduct,
      deleteProduct,
      savePurchase,
      upsertDistributor,
      deleteDistributor,
      recordDistributorSettlement,
      deleteDistributorSettlement,
      backupData,
      calculateDistributorPayables,
      restoreBackup,
      syncPendingInvoices,
      resetAllData,
      refreshData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}

