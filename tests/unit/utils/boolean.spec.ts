import { describe, it, expect } from 'vitest'
import { parseBoolean } from '~/utils/boolean'

describe('Boolean Utilities', () => {
  describe('parseBoolean', () => {
    it('returns true for boolean true', () => {
      expect(parseBoolean(true)).toBe(true)
    })

    it('returns false for boolean false', () => {
      expect(parseBoolean(false)).toBe(false)
    })

    it('returns true for string "true"', () => {
      expect(parseBoolean('true')).toBe(true)
    })

    it('returns false for string "false"', () => {
      expect(parseBoolean('false')).toBe(false)
    })

    it('handles case-insensitive string values', () => {
      expect(parseBoolean('TRUE')).toBe(true)
      expect(parseBoolean('False')).toBe(false)
      expect(parseBoolean('  true  ')).toBe(true)
      expect(parseBoolean('  FALSE  ')).toBe(false)
    })

    it('returns true for number 1', () => {
      expect(parseBoolean(1)).toBe(true)
    })

    it('returns false for number 0', () => {
      expect(parseBoolean(0)).toBe(false)
    })

    it('returns undefined for invalid inputs', () => {
      expect(parseBoolean('not a boolean')).toBeUndefined()
      expect(parseBoolean(2)).toBeUndefined()
      expect(parseBoolean(null)).toBeUndefined()
      expect(parseBoolean(undefined)).toBeUndefined()
      expect(parseBoolean({})).toBeUndefined()
      expect(parseBoolean([])).toBeUndefined()
    })
  })
})
