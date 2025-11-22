/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loadUsers, saveUsers, clearSessionUser, readSessionUser, writeSessionUser } from '../lib/storage'
import { ref, onValue, set, off } from 'firebase/database'
import { ensureFirebase, isFirebaseConfigured } from '../lib/firebase'
import { hashPassword, verifyPassword } from '../lib/encryption'

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
      if (JSON.stringify(loadedUsers) !== JSON.stringify(users)) {
        setTimeout(() => setUsers(loadedUsers), 0)
      }
      return
    }

    const { db } = ensureFirebase()
    if (!db) {
      const loadedUsers = loadUsers()
      if (JSON.stringify(loadedUsers) !== JSON.stringify(users)) {
        setTimeout(() => setUsers(loadedUsers), 0)
      }
      return
    }

    setTimeout(() => setLoading(true), 0)
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
  }, [online, users])

  // Login function
  const login = useCallback(async (username, password) => {
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
    
    // Check password - support both hashed and plaintext (for backward compatibility)
    let passwordMatches = false
    if (user.passwordHash) {
      // New hashed password
      passwordMatches = await verifyPassword(trimmedPassword, user.passwordHash)
    } else {
      // Old plaintext password (backward compatibility)
      // If password matches, hash it and update
      if (user.password === trimmedPassword) {
        passwordMatches = true
        // Auto-upgrade to hashed password
        const hashedPassword = await hashPassword(trimmedPassword)
        user.passwordHash = hashedPassword
        delete user.password
        await updateUser(user.id, { passwordHash: hashedPassword, password: null })
      }
    }
    
    if (!passwordMatches) {
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
    // Hash password before storing
    const passwordHash = await hashPassword(userData.password || '')
    
    const newUser = {
      id: `user-${Date.now()}`,
      username: userData.username,
      passwordHash, // Store hashed password
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
    const updatedUsers = await Promise.all(users.map(async u => {
      if (u.id === userId) {
        // Check for duplicate username (excluding current user)
        if (userData.username && users.some(u2 => u2.username === userData.username && u2.id !== userId)) {
          return { ...u, error: 'Username already exists' }
        }
        
        // Hash password if provided
        const updateData = { ...userData }
        if (updateData.password && updateData.password.trim() !== '') {
          updateData.passwordHash = await hashPassword(updateData.password)
          delete updateData.password // Remove plaintext password
        } else {
          delete updateData.password // Remove password field if empty
        }
        
        // Remove old plaintext password field if migrating
        if (updateData.passwordHash && u.password) {
          delete u.password
        }
        
        return {
          ...u,
          ...updateData,
          updatedAt: new Date().toISOString(),
        }
      }
      return u
    }))
    
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

  const replaceUsers = useCallback(async (nextUsers = []) => {
    const timestamp = Date.now()
    // Hash passwords for imported users if they're plaintext
    const mappedUsers = await Promise.all(
      (Array.isArray(nextUsers) ? nextUsers : []).map(async (user, index) => {
        // If user has plaintext password, hash it
        let passwordHash = user.passwordHash
        if (user.password && !passwordHash) {
          passwordHash = await hashPassword(user.password)
        }
        
        return {
          id: user.id || `user-${timestamp}-${index}`,
          username: (user.username || '').trim(),
          passwordHash, // Store hashed password
          name: user.name || user.username || 'User',
          active: user.active !== undefined ? user.active : true,
          permissions: Array.isArray(user.permissions) ? user.permissions : [],
          createdAt: user.createdAt || new Date().toISOString(),
          updatedAt: user.updatedAt || null,
        }
      })
    )

    const safeUsers = mappedUsers.filter((user) => user.username)

    setUsers(safeUsers)
    saveUsers(safeUsers)

    if (isFirebaseConfigured() && online) {
      try {
        const { db } = ensureFirebase()
        if (db) {
          const usersObj = safeUsers.reduce((acc, user) => ({ ...acc, [user.id]: user }), {})
          await set(ref(db, 'users'), usersObj)
        }
      } catch (error) {
        console.warn('Failed to replace users in Firebase, saved locally:', error)
      }
    }

    if (currentUser && !safeUsers.some((user) => user.username === currentUser)) {
      logout()
    }
  }, [online, currentUser, logout])

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
    replaceUsers,
    getCurrentUserData,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

