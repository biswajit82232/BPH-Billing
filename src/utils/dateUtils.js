import { format, parseISO, isValid } from 'date-fns'

/**
 * Safely parse a date string or Date object
 * @param {string|Date|null|undefined} dateInput - Date input to parse
 * @returns {Date|null} - Valid Date object or null if invalid
 */
export function safeParseDate(dateInput) {
  if (!dateInput) return null
  if (dateInput instanceof Date) {
    return isValid(dateInput) ? dateInput : null
  }
  if (typeof dateInput === 'string') {
    if (dateInput.trim() === '') return null
    // Try parseISO first (handles ISO strings)
    const isoDate = parseISO(dateInput)
    if (isValid(isoDate)) return isoDate
    // Fallback to new Date
    const date = new Date(dateInput)
    return isValid(date) ? date : null
  }
  return null
}

/**
 * Safely format a date
 * @param {string|Date|null|undefined} dateInput - Date input to format
 * @param {string} formatString - Format string (default: 'dd MMM yyyy')
 * @param {string} fallback - Fallback text if date is invalid (default: 'N/A')
 * @returns {string} - Formatted date string or fallback
 */
export function safeFormatDate(dateInput, formatString = 'dd MMM yyyy', fallback = 'N/A') {
  const date = safeParseDate(dateInput)
  if (!date) return fallback
  try {
    return format(date, formatString)
  } catch {
    return fallback
  }
}

/**
 * Safely format a date for input fields (yyyy-MM-dd)
 * @param {string|Date|null|undefined} dateInput - Date input to format
 * @returns {string} - Formatted date string (yyyy-MM-dd) or current date
 */
export function safeFormatDateInput(dateInput) {
  const date = safeParseDate(dateInput)
  if (!date) return format(new Date(), 'yyyy-MM-dd')
  try {
    return format(date, 'yyyy-MM-dd')
  } catch {
    return format(new Date(), 'yyyy-MM-dd')
  }
}

/**
 * Safely compare two dates
 * @param {string|Date|null|undefined} date1 - First date
 * @param {string|Date|null|undefined} date2 - Second date
 * @returns {number} - Negative if date1 < date2, positive if date1 > date2, 0 if equal or invalid
 */
export function safeCompareDates(date1, date2) {
  const d1 = safeParseDate(date1)
  const d2 = safeParseDate(date2)
  if (!d1 || !d2) return 0
  return d1.getTime() - d2.getTime()
}

/**
 * Check if a date is before another date
 * @param {string|Date|null|undefined} date1 - Date to check
 * @param {string|Date|null|undefined} date2 - Reference date (default: today)
 * @returns {boolean} - True if date1 is before date2
 */
export function isDateBefore(date1, date2 = new Date()) {
  const d1 = safeParseDate(date1)
  const d2 = safeParseDate(date2)
  if (!d1 || !d2) return false
  return d1.getTime() < d2.getTime()
}

/**
 * Check if a date is after another date
 * @param {string|Date|null|undefined} date1 - Date to check
 * @param {string|Date|null|undefined} date2 - Reference date (default: today)
 * @returns {boolean} - True if date1 is after date2
 */
export function isDateAfter(date1, date2 = new Date()) {
  const d1 = safeParseDate(date1)
  const d2 = safeParseDate(date2)
  if (!d1 || !d2) return false
  return d1.getTime() > d2.getTime()
}

/**
 * Get days difference between two dates
 * @param {string|Date|null|undefined} date1 - First date
 * @param {string|Date|null|undefined} date2 - Second date (default: today)
 * @returns {number|null} - Days difference or null if invalid
 */
export function getDaysDifference(date1, date2 = new Date()) {
  const d1 = safeParseDate(date1)
  const d2 = safeParseDate(date2)
  if (!d1 || !d2) return null
  const diffTime = d2.getTime() - d1.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

