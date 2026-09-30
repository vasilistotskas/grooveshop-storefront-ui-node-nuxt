import { describe, it, expect } from 'vitest'
import { getCursorFromUrl, generateInitialCursorState } from '~/utils/pagination'

describe('Pagination Utils', () => {
  describe('getCursorFromUrl', () => {
    it('should extract cursor from URL with default param name', () => {
      const url = 'https://example.com/api/products?cursor=abc123'
      expect(getCursorFromUrl(url)).toBe('abc123')
    })

    it('should extract cursor from URL with custom param name', () => {
      const url = 'https://example.com/api/products?page_cursor=xyz789'
      expect(getCursorFromUrl(url, 'page_cursor')).toBe('xyz789')
    })

    it('should return null when cursor param is not present', () => {
      const url = 'https://example.com/api/products?page=1'
      expect(getCursorFromUrl(url)).toBeNull()
    })

    it('should handle URL with multiple query params', () => {
      const url = 'https://example.com/api/products?limit=10&cursor=abc123&sort=name'
      expect(getCursorFromUrl(url)).toBe('abc123')
    })

    it('should handle empty cursor value', () => {
      const url = 'https://example.com/api/products?cursor='
      expect(getCursorFromUrl(url)).toBe('')
    })

    it('should handle URL with hash', () => {
      const url = 'https://example.com/api/products?cursor=abc123#section'
      expect(getCursorFromUrl(url)).toBe('abc123')
    })

    it('should handle encoded cursor values', () => {
      const url = 'https://example.com/api/products?cursor=abc%20123'
      expect(getCursorFromUrl(url)).toBe('abc 123')
    })
  })

  describe('generateInitialCursorState', () => {
    it('starts every cursor the store keeps empty', () => {
      expect(generateInitialCursorState()).toEqual({ blogPostsCursor: '', blogPostCommentsCursor: '' })
    })
  })
})
