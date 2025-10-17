import { describe, it, expect } from 'vitest'
import { useText } from '~/composables/useText'

describe('useText Composable', () => {
  const text = useText()

  describe('contentShorten', () => {
    it('should shorten content to specified length', () => {
      const content = 'This is a long piece of content that needs to be shortened'
      const result = text.contentShorten(content, 0, 20)

      expect(result.length).toBeLessThanOrEqual(23) // 20 + '...'
      expect(result).toContain('...')
    })

    it('should not shorten content shorter than max length', () => {
      const content = 'Short'
      const result = text.contentShorten(content, 0, 20)

      expect(result).toBe('Short')
    })

    it('should handle null content', () => {
      const result = text.contentShorten(null, 0, 20)

      expect(result).toBe('')
    })

    it('should handle undefined content', () => {
      const result = text.contentShorten(undefined, 0, 20)

      expect(result).toBe('')
    })

    it('should handle empty string', () => {
      const result = text.contentShorten('', 0, 20)

      expect(result).toBe('')
    })
  })

  describe('contentShortenByWords', () => {
    it('should shorten content by word count', () => {
      const content = 'This is a long piece of content with many words'
      const result = text.contentShortenByWords(content, 0, 5)

      expect(result).toBe('This is a long piece...')
    })

    it('should not shorten content with fewer words than max', () => {
      const content = 'Short content'
      const result = text.contentShortenByWords(content, 0, 5)

      expect(result).toBe('Short content')
    })

    it('should handle single word', () => {
      const content = 'Word'
      const result = text.contentShortenByWords(content, 0, 5)

      expect(result).toBe('Word')
    })
  })

  describe('capitalize', () => {
    it('should capitalize first letter of string', () => {
      expect(text.capitalize('hello')).toBe('Hello')
    })

    it('should capitalize all words when allWords is true', () => {
      expect(text.capitalize('hello world', true)).toBe('Hello World')
    })

    it('should handle empty string', () => {
      expect(text.capitalize('')).toBe('')
    })

    it('should handle single character', () => {
      expect(text.capitalize('a')).toBe('A')
    })

    it('should not change already capitalized string', () => {
      expect(text.capitalize('Hello')).toBe('Hello')
    })

    it('should handle string with multiple spaces', () => {
      expect(text.capitalize('hello  world', true)).toBe('Hello  World')
    })
  })

  describe('cleanHtml', () => {
    it('should remove HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>'
      expect(text.cleanHtml(html)).toBe('Hello world')
    })

    it('should handle self-closing tags', () => {
      const html = '<p>Hello<br/>world</p>'
      expect(text.cleanHtml(html)).toBe('Helloworld')
    })

    it('should handle nested tags', () => {
      const html = '<div><p><span>Hello</span></p></div>'
      expect(text.cleanHtml(html)).toBe('Hello')
    })

    it('should handle empty HTML', () => {
      expect(text.cleanHtml('')).toBe('')
    })

    it('should handle plain text', () => {
      expect(text.cleanHtml('Hello world')).toBe('Hello world')
    })

    it('should handle malformed HTML', () => {
      const html = '<p>Hello <strong>world'
      expect(text.cleanHtml(html)).toBe('Hello world')
    })
  })

  describe('Integration', () => {
    it('should chain operations', () => {
      const html = '<p>This is a long piece of HTML content</p>'
      const cleaned = text.cleanHtml(html)
      const shortened = text.contentShorten(cleaned, 0, 20)
      const capitalized = text.capitalize(shortened)

      expect(capitalized).toContain('This is a long')
      expect(capitalized[0]).toBe('T')
    })
  })
})
