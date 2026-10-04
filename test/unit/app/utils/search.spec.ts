import { describe, it, expect } from 'vitest'
import { getDisplayTitle, getDisplaySubtitle, highlightSegments } from '~/utils/search'

describe('Search Utils', () => {
  describe('getDisplayTitle', () => {
    it('should return product name for product result', () => {
      const result = {
        contentType: 'product',
        name: 'Test Product',
      } as SearchResult

      expect(getDisplayTitle(result)).toBe('Test Product')
    })

    it('should strip HTML from product name', () => {
      const result = {
        contentType: 'product',
        name: '<strong>Bold</strong> Product',
      } as SearchResult

      expect(getDisplayTitle(result)).toBe('Bold Product')
    })

    it('should return empty string for product without name', () => {
      const result = {
        contentType: 'product',
      } as SearchResult

      expect(getDisplayTitle(result)).toBe('')
    })

    it('should return post title for post result', () => {
      const result = {
        contentType: 'post',
        title: 'Test Post',
      } as SearchResult

      expect(getDisplayTitle(result)).toBe('Test Post')
    })

    it('should strip HTML from post title', () => {
      const result = {
        contentType: 'post',
        title: '<em>Italic</em> Post',
      } as SearchResult

      expect(getDisplayTitle(result)).toBe('Italic Post')
    })

    it('should return empty string for post without title', () => {
      const result = {
        contentType: 'post',
      } as SearchResult

      expect(getDisplayTitle(result)).toBe('')
    })
  })

  describe('getDisplaySubtitle', () => {
    it('should return product description', () => {
      const result = {
        contentType: 'product',
        description: 'Product description',
      } as SearchResult

      expect(getDisplaySubtitle(result)).toBe('Product description')
    })

    it('should strip HTML from product description', () => {
      const result = {
        contentType: 'product',
        description: '<p>Product <strong>description</strong></p>',
      } as SearchResult

      expect(getDisplaySubtitle(result)).toBe('Product description')
    })

    it('should truncate long product description', () => {
      const longText = 'a'.repeat(200)
      const result = {
        contentType: 'product',
        description: longText,
      } as SearchResult

      expect(getDisplaySubtitle(result, 150)).toBe(`${'a'.repeat(150)}...`)
    })

    it('should not truncate short product description', () => {
      const result = {
        contentType: 'product',
        description: 'Short description',
      } as SearchResult

      expect(getDisplaySubtitle(result, 150)).toBe('Short description')
    })

    it('should return empty string for product without description', () => {
      const result = {
        contentType: 'product',
      } as SearchResult

      expect(getDisplaySubtitle(result)).toBe('')
    })

    it('should return post subtitle', () => {
      const result = {
        contentType: 'post',
        subtitle: 'Post subtitle',
      } as SearchResult

      expect(getDisplaySubtitle(result)).toBe('Post subtitle')
    })

    it('should return post body if no subtitle', () => {
      const result = {
        contentType: 'post',
        body: 'Post body content',
      } as SearchResult

      expect(getDisplaySubtitle(result)).toBe('Post body content')
    })

    it('should strip HTML from post body', () => {
      const result = {
        contentType: 'post',
        body: '<div>Post <span>body</span></div>',
      } as SearchResult

      expect(getDisplaySubtitle(result)).toBe('Post body')
    })

    it('should truncate long post body', () => {
      const longText = 'b'.repeat(200)
      const result = {
        contentType: 'post',
        body: longText,
      } as SearchResult

      const subtitle = getDisplaySubtitle(result, 150)
      expect(subtitle.length).toBe(153) // 150 + '...'
      expect(subtitle).toMatch(/\.\.\.$/)
    })

    it('should prefer subtitle over body for posts', () => {
      const result = {
        contentType: 'post',
        subtitle: 'Subtitle',
        body: 'Body',
      } as SearchResult

      expect(getDisplaySubtitle(result)).toBe('Subtitle')
    })

    it('should use custom max length', () => {
      const longText = 'c'.repeat(100)
      const result = {
        contentType: 'product',
        description: longText,
      } as SearchResult

      expect(getDisplaySubtitle(result, 50)).toBe(`${'c'.repeat(50)}...`)
    })

    it('cuts on the text, after the markup is stripped', () => {
      // Tags do not count towards the limit, and a cut never lands
      // inside one.
      const result = {
        contentType: 'product',
        description: `<p><strong>${'d'.repeat(20)}</strong></p>`,
      } as SearchResult

      expect(getDisplaySubtitle(result, 10)).toBe(`${'d'.repeat(10)}...`)
      expect(getDisplaySubtitle(result, 20)).toBe('d'.repeat(20))
    })
  })

  describe('highlightSegments', () => {
    it('flags the runs that match a typed word, in any case', () => {
      expect(highlightSegments('Power bank 20,000mAh', 'POWER b')).toEqual([
        { text: 'Power', match: true },
        { text: ' bank 20,000mAh', match: false },
      ])
    })

    it('flags every word of the query, longest first', () => {
      expect(highlightSegments('Power bank slim', 'bank power')).toEqual([
        { text: 'Power', match: true },
        { text: ' ', match: false },
        { text: 'bank', match: true },
        { text: ' slim', match: false },
      ])
    })

    it('prefers the longer word where one starts another', () => {
      expect(highlightSegments('Power bank', 'pow power')).toEqual([
        { text: 'Power', match: true },
        { text: ' bank', match: false },
      ])
    })

    it('ignores a one-character word, which would flag half the title', () => {
      expect(highlightSegments('Power bank', 'p')).toEqual([{ text: 'Power bank', match: false }])
    })

    it('flags a match in the middle of a word', () => {
      expect(highlightSegments('Powerbank', 'bank')).toEqual([
        { text: 'Power', match: false },
        { text: 'bank', match: true },
      ])
    })

    it('matches characters that mean something to a pattern literally', () => {
      expect(highlightSegments('USB-C (fast) cable', '(fast)')).toEqual([
        { text: 'USB-C ', match: false },
        { text: '(fast)', match: true },
        { text: ' cable', match: false },
      ])
    })

    it('flags Greek text', () => {
      expect(highlightSegments('Θήκη κινητού', 'κινητ')).toEqual([
        { text: 'Θήκη ', match: false },
        { text: 'κινητ', match: true },
        { text: 'ού', match: false },
      ])
    })

    it('leaves text alone for an empty query, and returns no runs for no text', () => {
      expect(highlightSegments('Power bank', '  ')).toEqual([{ text: 'Power bank', match: false }])
      expect(highlightSegments('', 'bank')).toEqual([{ text: '', match: false }])
    })
  })
})
