import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loadUsers, saveUsers, clearSessionUser, readSessionUser, writeSessionUser } from '../lib/storage'
import { ref, onValue, set, off } from 'firebase/database'
import { ensureFirebase, isFirebaseConfigured } from '../lib/firebase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Default pages/routes in the application
export const ALL_PAGES = [
  { path: '/', name: 'Dashboard', key: 'dashboard' },
  { path: '/invoices', name: 'Invoices', key: 'invoices' },
  { path: '/customers', name: 'Customers', key: 'customers' },
  { path: '/products', name: 'Products', key: 'products' },
  { path: '/gst-report', name: 'GST Report', key: 'gst-report' },
  { path: '/aging-report', name: 'Aging Report', key: 'aging-report' },
  { path: '/backup', name: 'Settings', key: 'settings' },
]

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => readSessionUser())
  const [users, setUsers] = useState(() => loadUsers())
  const [loading, setLoading] = useState(false)
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  // Monitor online/offline status
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

  // Load users from Firebase or localStorage
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const loadedUsers = loadUsers()
      setUsers(loadedUsers)
      return
    }

    const { db } = ensureFirebase()
    if (!db) {
      const loadedUsers = loadUsers()
      setUsers(loadedUsers)
      return
    }

    setLoading(true)
    const usersRef = ref(db, 'users')
    const listener = onValue(
      usersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const value = snapshot.val()
          const usersArray = Array.isArray(value) ? value : Object.values(value)
          setUsers(usersArray)
          // Also save to localStorage for offline access
          saveUsers(usersArray)
        } else {
          // No users in Firebase, load from localStorage
          const loadedUsers = loadUsers()
          setUsers(loadedUsers)
          // Sync default users to Firebase if online
          if (online && loadedUsers.length > 0) {
            const usersObj = loadedUsers.reduce((acc, user) => ({ ...acc, [user.id]: user }), {})
            set(ref(db, 'users'), usersObj).catch(console.warn)
          }
        }
        setLoading(false)
      },
      (error) => {
        console.warn('Firebase users subscription error:', error)
        const loadedUsers = loadUsers()
        setUsers(loadedUsers)
        setLoading(false)
      }
    )

    return () => {
      off(usersRef)
      listener()
    }
  }, [online])

  // Login function
  const login = useCallback((username, password) => {
    // Trim whitespace from inputs
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()
    
    // Find user by username (case-insensitive)
    const user = users.find(u => 
      u.username.trim().toLowerCase() === trimmedUsername.toLowerCase()
    )
    
    if (!user) {
      return { success: false, error: 'Username not found' }
    }
    
    // Check if user is active
    if (!user.active) {
      return { success: false, error: 'User account is inactive. Please contact administrator.' }
    }
    
    // Check password (exact match, case-sensitive)
    if (user.password !== trimmedPassword) {
      return { success: false, error: 'Invalid password' }
    }
    
    // Login successful
    writeSessionUser(user.username)
    setCurrentUser(user.username)
    return { success: true, user }
  }, [users])

  // Logout function
  const logout = useCallback(() => {
    clearSessionUser()
    setCurrentUser(null)
  }, [])

  // Check if user has permission to access a page
  const hasPermission = useCallback((pageKey) => {
    if (!currentUser) return false
    const user = users.find(u => u.username === currentUser)
    if (!user || !user.active) return false
    
    // If no permissions array, allow all (backward compatibility)
    if (!user.permissions || user.permissions.length === 0) return true
    
    // Check if page is in user's permissions
    return user.permissions.includes(pageKey) || user.permissions.includes('all')
  }, [currentUser, users])

  // Add new user
  const addUser = useCallback(async (userData) => {
    const newUser = {
      id: `user-${Date.now()}`,
      username: userData.username,
      password: userData.password,
      name: userData.name || userData.username,
      active: userData.active !== undefined ? userData.active : true,
      permissions: userData.permissions || [],
      createdAt: new Date().toISOString(),
    }
    
    // Check for duplicate username
    if (users.some(u => u.username === newUser.username)) {
      return { success: false, error: 'Username already exists' }
    }
    
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    saveUsers(updatedUsers) // Save to localStorage immediately
    
    // Sync to Firebase if online
    if (isFirebaseConfigured() && online) {
      try {
        const { db } = ensureFirebase()
        if (db) {
          await set(ref(db, `users/${newUser.id}`), newUser)
        }
      } catch (error) {
        console.warn('Failed to save user to Firebase, saved locally:', error)
      }
    }
    
    return { success: true, user: newUser }
  }, [users, online])

  // Update user
  const updateUser = useCallback(async (userId, userData) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        // Check for duplicate username (excluding current user)
        if (userData.username && users.some(u2 => u2.username === userData.username && u2.id !== userId)) {
          return { ...u, error: 'Username already exists' }
        }
        
        // If password is empty, don't update it (keep existing)
        const updateData = { ...userData }
        if (!updateData.password || updateData.password.trim() === '') {
          delete updateData.password
        }
        
        return {
          ...u,
          ...updateData,
          updatedAt: new Date().toISOString(),
        }
      }
      return u
    })
    
    // Check if there was a duplicate username error
    const hasError = updatedUsers.some(u => u.error)
    if (hasError) {
      return { success: false, error: 'Username already exists' }
    }
    
    setUsers(updatedUsers)
    saveUsers(updatedUsers) // Save to localStorage immediately
    
    // Sync to Firebase if online
    if (isFirebaseConfigured() && online) {
      try {
        const { db } = ensureFirebase()
        if (db) {
          const updatedUser = updatedUsers.find(u => u.id === userId)
          if (updatedUser) {
            await set(ref(db, `users/${userId}`), updatedUser)
          }
        }
      } catch (error) {
        console.warn('Failed to update user in Firebase, saved locally:', error)
      }
    }
    
    return { success: true }
  }, [users, online])

  // Delete user
  const deleteUser = useCallback(async (userId) => {
    const updatedUsers = users.filter(u => u.id !== userId)
    setUsers(updatedUsers)
    saveUsers(updatedUsers) // Save to localStorage immediately
    
    // Sync to Firebase if online
    if (isFirebaseConfigured() && online) {
      try {
        const { db } = ensureFirebase()
        if (db) {
          await set(ref(db, `users/${userId}`), null)
        }
      } catch (error) {
        console.warn('Failed to delete user from Firebase, saved locally:', error)
      }
    }
    
    // If deleted user is current user, logout
    const deletedUser = users.find(u => u.id === userId)
    if (deletedUser && deletedUser.username === currentUser) {
      logout()
    }
    
    return { success: true }
  }, [users, currentUser, logout, online])

  // Get current user data
  const getCurrentUserData = useCallback(() => {
    if (!currentUser) return null
    return users.find(u => u.username === currentUser)
  }, [currentUser, users])

  const value = {
    currentUser,
    users,
    login,
    logout,
    hasPermission,
    addUser,
    updateUser,
    deleteUser,
    getCurrentUserData,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

