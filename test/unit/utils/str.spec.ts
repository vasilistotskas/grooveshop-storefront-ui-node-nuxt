import { describe, it, expect } from 'vitest'
import { capitalize, contentShorten, contentShortenByWords, cleanHtml } from '~/utils/str'

describe('String Utilities', () => {
  describe('capitalize', () => {
    it('capitalizes the first letter of a string', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('hello world')).toBe('Hello world')
    })

    it('capitalizes all words in a string when allWords is true', () => {
      expect(capitalize('hello world', true)).toBe('Hello World')
      expect(capitalize('hello beautiful world', true)).toBe('Hello Beautiful World')
    })

    it('handles empty strings', () => {
      expect(capitalize('')).toBe('')
    })
  })

  describe('contentShorten', () => {
    it('shortens content to specified length', () => {
      expect(contentShorten('This is a long text that needs to be shortened', 0, 10)).toBe('This is a ...')
    })

    it('returns the original content if it is shorter than the specified length', () => {
      expect(contentShorten('Short text', 0, 20)).toBe('Short text')
    })

    it('handles null or undefined content', () => {
      expect(contentShorten(null)).toBe('')
      expect(contentShorten(undefined)).toBe('')
    })

    it('uses custom suffix', () => {
      expect(contentShorten('This is a long text', 0, 10, '---')).toBe('This is a ---')
    })
  })

  describe('contentShortenByWords', () => {
    it('shortens content to specified number of words', () => {
      expect(contentShortenByWords('This is a long text that needs to be shortened', 0, 3)).toBe('This is a...')
    })

    it('returns the original content if it has fewer words than specified', () => {
      expect(contentShortenByWords('Short text', 0, 5)).toBe('Short text')
    })

    it('uses custom suffix', () => {
      expect(contentShortenByWords('This is a long text', 0, 3, '---')).toBe('This is a---')
    })
  })

  describe('cleanHtml', () => {
    it('removes HTML tags from a string', () => {
      expect(cleanHtml('<p>This is <strong>bold</strong> text</p>')).toBe('This is bold text')
    })

    it('handles strings without HTML tags', () => {
      expect(cleanHtml('Plain text')).toBe('Plain text')
    })
  })
})
