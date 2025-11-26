/**
 * Phone number utilities for Indian phone numbers
 */

/**
 * Clean phone number - remove all non-digit characters
 * @param {string} phone - Raw phone number
 * @returns {string} - Digits only
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Format phone number for WhatsApp (with country code)
 * @param {string} phone - Phone number (10 digits or with country code)
 * @returns {string} - Formatted for WhatsApp (e.g., "919635505436")
 */
export function formatPhoneForWhatsApp(phone) {
  const clean = cleanPhoneNumber(phone)
  
  if (clean.length === 10) {
    // Indian 10-digit number, add country code
    return '91' + clean
  } else if (clean.length === 12 && clean.startsWith('91')) {
    // Already has India country code
    return clean
  } else if (clean.length === 11 && clean.startsWith('0')) {
    // Has leading 0, remove it and add country code
    return '91' + clean.substring(1)
  }
  
  // Return as-is if length doesn't match expected formats
  return clean
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} - Formatted display (e.g., "9635 505 436")
 */
export function formatPhoneForDisplay(phone) {
  const clean = cleanPhoneNumber(phone)
  
  if (clean.length === 10) {
    // Format as: XXXX XXX XXX
    return `${clean.substring(0, 4)} ${clean.substring(4, 7)} ${clean.substring(7)}`
  } else if (clean.length === 12 && clean.startsWith('91')) {
    // Format as: +91 XXXX XXX XXX
    return `+91 ${clean.substring(2, 6)} ${clean.substring(6, 9)} ${clean.substring(9)}`
  }
  
  return phone // Return original if can't format
}

/**
 * Validate Indian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid 10-digit Indian number
 */
export function isValidIndianPhone(phone) {
  const clean = cleanPhoneNumber(phone)
  
  // Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(clean)
}

/**
 * Get phone number validation error message
 * @param {string} phone - Phone number to validate
 * @returns {string|null} - Error message or null if valid
 */
export function getPhoneValidationError(phone) {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required'
  }
  
  const clean = cleanPhoneNumber(phone)
  
  if (clean.length === 0) {
    return 'Please enter a valid phone number'
  }
  
  if (clean.length < 10) {
    return `Phone number must be 10 digits (${clean.length} entered)`
  }
  
  if (clean.length > 10 && clean.length !== 12) {
    return 'Invalid phone number format'
  }
  
  if (clean.length === 10 && !/^[6-9]/.test(clean)) {
    return 'Indian mobile numbers must start with 6, 7, 8, or 9'
  }
  
  return null // Valid
}

