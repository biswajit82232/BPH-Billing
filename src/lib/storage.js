const LOCAL_QUEUE_KEY = 'pendingInvoices'
const SESSION_KEY = 'bph_user'
const LOCAL_DATA_KEY = 'bph_local_data'

export function loadPendingInvoices() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function persistPendingInvoices(items) {
  localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(items))
}

export function clearPendingInvoices() {
  localStorage.removeItem(LOCAL_QUEUE_KEY)
}

export function readSessionUser() {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function writeSessionUser(user) {
  localStorage.setItem(SESSION_KEY, user)
}

export function clearSessionUser() {
  localStorage.removeItem(SESSION_KEY)
}

// Local storage persistence for when Firebase is not configured
export function loadLocalData() {
  try {
    const data = localStorage.getItem(LOCAL_DATA_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('Failed to load local data:', error)
  }
  return null
}

export function saveLocalData(data) {
  try {
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save local data:', error)
  }
}

export function clearLocalData() {
  try {
    localStorage.removeItem(LOCAL_DATA_KEY)
  } catch (error) {
    console.warn('Failed to clear local data:', error)
  }
}

// User management storage
const USERS_KEY = 'bph_users'

export function loadUsers() {
  try {
    const data = localStorage.getItem(USERS_KEY)
    if (data) {
      return JSON.parse(data)
    }
    // Return default admin user if no users exist
    return [
      {
        id: 'user-admin',
        username: 'admin',
        password: 'admin123',
        name: 'Administrator',
        active: true,
        permissions: ['all'],
        createdAt: new Date().toISOString(),
      }
    ]
  } catch (error) {
    console.error('Error loading users:', error)
    return []
  }
}

export function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch (error) {
    console.error('Error saving users:', error)
  }
}

export function clearUsers() {
  try {
    localStorage.removeItem(USERS_KEY)
  } catch (error) {
    console.warn('Failed to clear users:', error)
  }
}

// Clear ALL local storage data
export function clearAllLocalStorage() {
  try {
    // Clear all BPH-related keys
    localStorage.removeItem(LOCAL_DATA_KEY)
    localStorage.removeItem(LOCAL_QUEUE_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USERS_KEY)
    
    // Also clear any other potential keys
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('bph_') || key.startsWith('BPH_'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.warn('Failed to clear all local storage:', error)
  }
}

