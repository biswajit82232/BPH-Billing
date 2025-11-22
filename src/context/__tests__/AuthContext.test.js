/* eslint-env jest */
/* eslint-disable no-undef */
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { hashPassword } from '../../lib/encryption'

// Mock storage
jest.mock('../../lib/storage', () => ({
  loadUsers: jest.fn(() => []),
  saveUsers: jest.fn(),
  clearSessionUser: jest.fn(),
  readSessionUser: jest.fn(() => null),
  writeSessionUser: jest.fn(),
}))

// Mock Firebase
jest.mock('../../lib/firebase', () => ({
  ensureFirebase: jest.fn(() => ({ db: null, configured: false })),
  isFirebaseConfigured: jest.fn(() => false),
}))

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current).toHaveProperty('currentUser')
    expect(result.current).toHaveProperty('login')
    expect(result.current).toHaveProperty('logout')
    expect(result.current).toHaveProperty('hasPermission')
  })

  it('initializes with no current user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.currentUser).toBeNull()
  })

  it('allows adding a new user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      const response = await result.current.addUser({
        username: 'testuser',
        password: 'testpass123',
        name: 'Test User',
      })
      expect(response.success).toBe(true)
      expect(response.user).toHaveProperty('username', 'testuser')
      expect(response.user).toHaveProperty('passwordHash')
      expect(response.user).not.toHaveProperty('password')
    })

    expect(result.current.users.length).toBe(1)
  })

  it('prevents duplicate usernames', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.addUser({
        username: 'testuser',
        password: 'testpass123',
      })
    })

    await act(async () => {
      const response = await result.current.addUser({
        username: 'testuser',
        password: 'anotherpass',
      })
      expect(response.success).toBe(false)
      expect(response.error).toContain('already exists')
    })
  })

  it('logs in with correct credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    // Add user first
    await act(async () => {
      await result.current.addUser({
        username: 'testuser',
        password: 'testpass123',
      })
    })

    // Login
    await act(async () => {
      const response = await result.current.login('testuser', 'testpass123')
      expect(response.success).toBe(true)
      expect(response.user).toHaveProperty('username', 'testuser')
    })

    expect(result.current.currentUser).toBe('testuser')
  })

  it('rejects incorrect password', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.addUser({
        username: 'testuser',
        password: 'testpass123',
      })
    })

    await act(async () => {
      const response = await result.current.login('testuser', 'wrongpass')
      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid password')
    })

    expect(result.current.currentUser).toBeNull()
  })

  it('rejects non-existent username', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      const response = await result.current.login('nonexistent', 'password')
      expect(response.success).toBe(false)
      expect(response.error).toContain('not found')
    })
  })

  it('logs out successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.addUser({
        username: 'testuser',
        password: 'testpass123',
      })
      await result.current.login('testuser', 'testpass123')
    })

    expect(result.current.currentUser).toBe('testuser')

    act(() => {
      result.current.logout()
    })

    expect(result.current.currentUser).toBeNull()
  })

  it('checks permissions correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.addUser({
        username: 'testuser',
        password: 'testpass123',
        permissions: ['dashboard', 'invoices'],
      })
      await result.current.login('testuser', 'testpass123')
    })

    expect(result.current.hasPermission('dashboard')).toBe(true)
    expect(result.current.hasPermission('invoices')).toBe(true)
    expect(result.current.hasPermission('customers')).toBe(false)
  })

  it('allows all permissions if user has "all" permission', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.addUser({
        username: 'admin',
        password: 'admin123',
        permissions: ['all'],
      })
      await result.current.login('admin', 'admin123')
    })

    expect(result.current.hasPermission('dashboard')).toBe(true)
    expect(result.current.hasPermission('customers')).toBe(true)
    expect(result.current.hasPermission('any-page')).toBe(true)
  })
})

