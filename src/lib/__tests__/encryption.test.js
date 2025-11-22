/* eslint-env jest */
/* eslint-disable no-undef */
import { encrypt, decrypt, hashPassword, verifyPassword, encryptCustomerFields, decryptCustomerFields } from '../encryption'

describe('encryption', () => {
  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts text correctly', () => {
      const original = '123456789012'
      const encrypted = encrypt(original)
      expect(encrypted).not.toBe(original)
      expect(encrypted.length).toBeGreaterThan(0)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(original)
    })

    it('handles empty strings', () => {
      expect(encrypt('')).toBe('')
      expect(decrypt('')).toBe('')
    })

    it('handles already decrypted text (backward compatibility)', () => {
      const plain = 'plaintext'
      expect(decrypt(plain)).toBe(plain)
    })
  })

  describe('hashPassword/verifyPassword', () => {
    it('hashes passwords consistently', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      expect(hash1).toBe(hash2)
      expect(hash1.length).toBe(64) // SHA-256 produces 64 char hex
    })

    it('verifies correct passwords', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('rejects incorrect passwords', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('handles empty passwords', async () => {
      const hash = await hashPassword('')
      expect(hash).toBe('')
      expect(await verifyPassword('', '')).toBe(false)
    })
  })

  describe('encryptCustomerFields/decryptCustomerFields', () => {
    it('encrypts sensitive customer fields', () => {
      const customer = {
        name: 'John Doe',
        aadhaar: '123456789012',
        dob: '1990-01-01',
        phone: '9876543210'
      }
      const encrypted = encryptCustomerFields(customer)
      expect(encrypted.name).toBe(customer.name)
      expect(encrypted.phone).toBe(customer.phone)
      expect(encrypted.aadhaar).not.toBe(customer.aadhaar)
      expect(encrypted.aadhaar.length).toBeGreaterThan(0)
      expect(encrypted.dob).not.toBe(customer.dob)
    })

    it('decrypts sensitive customer fields', () => {
      const customer = {
        name: 'John Doe',
        aadhaar: '123456789012',
        dob: '1990-01-01',
        phone: '9876543210'
      }
      const encrypted = encryptCustomerFields(customer)
      const decrypted = decryptCustomerFields(encrypted)
      expect(decrypted.name).toBe(customer.name)
      expect(decrypted.aadhaar).toBe(customer.aadhaar)
      expect(decrypted.dob).toBe(customer.dob)
      expect(decrypted.phone).toBe(customer.phone)
    })

    it('handles missing sensitive fields', () => {
      const customer = { name: 'John Doe', phone: '9876543210' }
      const encrypted = encryptCustomerFields(customer)
      const decrypted = decryptCustomerFields(encrypted)
      expect(decrypted.name).toBe(customer.name)
      expect(decrypted.aadhaar).toBeUndefined()
    })
  })
})

