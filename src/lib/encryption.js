import CryptoJS from 'crypto-js'

// Encryption key - in production, this should be stored securely
// For single business use, this is acceptable
// For multi-tenant, use per-user keys or secure key management
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'bph-default-encryption-key-2024'

/**
 * Encrypt sensitive data (Aadhaar, DOB)
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text
 */
export function encrypt(text) {
  if (!text || text.trim() === '') return ''
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
  } catch (error) {
    console.error('Encryption error:', error)
    return text // Return original if encryption fails
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text
 * @returns {string} - Decrypted text
 */
export function decrypt(encryptedText) {
  if (!encryptedText || encryptedText.trim() === '') return ''
  
  // Check if already decrypted (backward compatibility)
  if (!encryptedText.includes('U2FsdGVkX1')) {
    return encryptedText
  }
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted || encryptedText // Return original if decryption fails
  } catch (error) {
    console.error('Decryption error:', error)
    return encryptedText // Return original if decryption fails
  }
}

/**
 * Hash password using SHA-256
 * Note: For production, consider using bcrypt (requires backend) or Web Crypto API
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password
 */
export async function hashPassword(password) {
  if (!password) return ''
  
  try {
    // Use Web Crypto API for hashing (more secure than CryptoJS)
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch (error) {
    console.error('Password hashing error:', error)
    // Fallback to CryptoJS SHA-256 if Web Crypto API fails
    return CryptoJS.SHA256(password).toString()
  }
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) return false
  
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * Encrypt customer sensitive fields
 * @param {object} customer - Customer object
 * @returns {object} - Customer with encrypted fields
 */
export function encryptCustomerFields(customer) {
  if (!customer) return customer
  
  return {
    ...customer,
    aadhaar: customer.aadhaar ? encrypt(customer.aadhaar) : customer.aadhaar,
    dob: customer.dob ? encrypt(customer.dob) : customer.dob,
  }
}

/**
 * Decrypt customer sensitive fields
 * @param {object} customer - Customer object with encrypted fields
 * @returns {object} - Customer with decrypted fields
 */
export function decryptCustomerFields(customer) {
  if (!customer) return customer
  
  return {
    ...customer,
    aadhaar: customer.aadhaar ? decrypt(customer.aadhaar) : customer.aadhaar,
    dob: customer.dob ? decrypt(customer.dob) : customer.dob,
  }
}

