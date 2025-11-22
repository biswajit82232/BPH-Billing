/**
 * Google Drive Backup Utility
 * 
 * This module provides functionality to backup data to Google Drive.
 * Uses Google Drive API v3 for file uploads.
 * 
 * Note: Requires OAuth 2.0 authentication
 */

// Check if Google API is available
function isGoogleAPIAvailable() {
  return typeof window !== 'undefined' && window.gapi && window.gapi.client
}

/**
 * Initialize Google API client
 * @param {string} apiKey - Google API key
 * @param {string} clientId - OAuth 2.0 client ID
 * @param {Array<string>} scopes - OAuth scopes
 * @returns {Promise<boolean>} - True if initialized successfully
 */
export async function initGoogleAPI(apiKey, clientId, scopes = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
]) {
  if (!apiKey || !clientId) {
    throw new Error('Google API key and Client ID are required')
  }

  try {
    // Load Google API script if not already loaded
    if (!window.gapi) {
      await loadGoogleAPIScript()
    }

    // Initialize the client
    await window.gapi.load('client:auth2')

    await window.gapi.client.init({
      apiKey,
      clientId,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        'https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest'
      ],
      scope: scopes.join(' ')
    })

    return true
  } catch (error) {
    console.error('Failed to initialize Google API:', error)
    throw error
  }
}

/**
 * Load Google API script dynamically
 */
function loadGoogleAPIScript() {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * Check if user is authenticated with Google
 * @returns {boolean} - True if authenticated
 */
export function isAuthenticated() {
  if (!isGoogleAPIAvailable()) return false
  return window.gapi.auth2.getAuthInstance().isSignedIn.get()
}

/**
 * Sign in to Google
 * @returns {Promise<boolean>} - True if sign in successful
 */
export async function signIn() {
  if (!isGoogleAPIAvailable()) {
    throw new Error('Google API not initialized')
  }

  try {
    const authInstance = window.gapi.auth2.getAuthInstance()
    await authInstance.signIn()
    return authInstance.isSignedIn.get()
  } catch (error) {
    console.error('Failed to sign in:', error)
    throw error
  }
}

/**
 * Sign out from Google
 */
export async function signOut() {
  if (!isGoogleAPIAvailable()) return

  try {
    const authInstance = window.gapi.auth2.getAuthInstance()
    await authInstance.signOut()
  } catch (error) {
    console.error('Failed to sign out:', error)
  }
}

/**
 * Upload JSON backup to Google Drive
 * @param {Object} data - Data to backup (JSON object)
 * @param {string} filename - Filename for the backup
 * @returns {Promise<string>} - File ID of uploaded file
 */
export async function uploadToDrive(data, filename = null) {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated with Google')
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  const defaultFilename = `bph-backup-${timestamp}.json`
  const finalFilename = filename || defaultFilename

  try {
    // Convert data to JSON string
    const jsonData = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })

    // Create file metadata
    const metadata = {
      name: finalFilename,
      mimeType: 'application/json',
      parents: [] // Upload to root folder (or specify folder ID)
    }

    // Upload file
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', blob)

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
      },
      body: form
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to upload to Google Drive')
    }

    const file = await response.json()
    return file.id
  } catch (error) {
    console.error('Failed to upload to Drive:', error)
    throw error
  }
}

/**
 * Export data to Google Sheets
 * @param {Object} data - Data to export
 * @param {string} sheetName - Name for the sheet
 * @returns {Promise<string>} - Spreadsheet ID
 */
export async function exportToSheets(data, sheetName = 'BPH Backup') {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated with Google')
  }

  try {
    // Create new spreadsheet
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.create({
      properties: {
        title: `${sheetName} - ${new Date().toISOString().slice(0, 10)}`
      }
    })

    const spreadsheetId = spreadsheet.result.spreadsheetId

    // Convert data to 2D array format
    const values = [Object.keys(data)]
    
    // Add data rows (simplified - you may want to handle nested objects differently)
    if (Array.isArray(data.invoices)) {
      values.push(['=== INVOICES ==='])
      values.push(['ID', 'Invoice No', 'Date', 'Customer', 'Amount', 'Status'])
      data.invoices.forEach(inv => {
        values.push([
          inv.id || '',
          inv.invoiceNo || '',
          inv.date || '',
          inv.customerName || '',
          inv.totals?.grandTotal || 0,
          inv.status || ''
        ])
      })
    }

    if (Array.isArray(data.customers)) {
      values.push([])
      values.push(['=== CUSTOMERS ==='])
      values.push(['ID', 'Name', 'Phone', 'Email', 'State', 'GSTIN'])
      data.customers.forEach(cust => {
        values.push([
          cust.id || '',
          cust.name || '',
          cust.phone || '',
          cust.email || '',
          cust.state || '',
          cust.gstin || ''
        ])
      })
    }

    // Write data to sheet
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: {
        values
      }
    })

    return spreadsheetId
  } catch (error) {
    console.error('Failed to export to Sheets:', error)
    throw error
  }
}

