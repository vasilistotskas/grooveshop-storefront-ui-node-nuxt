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
    it('should generate initial cursor state with empty strings', () => {
      const state = generateInitialCursorState()
      expect(state).toBeDefined()
      expect(typeof state).toBe('object')

      // Should have exactly 2 keys based on PaginationCursorStateEnum
      expect(Object.keys(state).length).toBe(2)

      // All values should be empty strings
      Object.values(state).forEach((value) => {
        expect(value).toBe('')
      })
    })

    it('should include all pagination cursor state enum values', () => {
      const state = generateInitialCursorState()

      // Should include blogPostsCursor and blogPostCommentsCursor
      expect(state).toHaveProperty('blogPostsCursor')
      expect(state).toHaveProperty('blogPostCommentsCursor')
      expect(state.blogPostsCursor).toBe('')
      expect(state.blogPostCommentsCursor).toBe('')
    })
  })
})
