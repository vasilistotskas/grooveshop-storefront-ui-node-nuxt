import { describe, it, expect } from 'vitest'
import { extractTranslated } from '~/utils/translate'

describe('Translate Utils', () => {
  describe('extractTranslated', () => {
    it('should extract simple field translation', () => {
      const object = {
        translations: {
          en: { name: 'English Name' },
          el: { name: 'Greek Name' },
        },
      }
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBe('English Name')
    })

    it('should extract translation for different locale', () => {
      const object = {
        translations: {
          en: { name: 'English Name' },
          el: { name: 'Greek Name' },
        },
      }
      const result = extractTranslated(object, 'name', 'el')
      expect(result).toBe('Greek Name')
    })

    it('should extract nested field translation', () => {
      const object = {
        translations: {
          en: {
            product: {
              title: 'Product Title',
            },
          },
        },
      }
      const result = extractTranslated(object, 'product.title', 'en')
      expect(result).toBe('Product Title')
    })

    it('should extract deeply nested field translation', () => {
      const object = {
        translations: {
          en: {
            level1: {
              level2: {
                level3: 'Deep Value',
              },
            },
          },
        },
      }
      const result = extractTranslated(object, 'level1.level2.level3', 'en')
      expect(result).toBe('Deep Value')
    })

    it('should return undefined for missing locale', () => {
      const object = {
        translations: {
          en: { name: 'English Name' },
        },
      }
      const result = extractTranslated(object, 'name', 'fr')
      expect(result).toBeUndefined()
    })

    it('should return undefined for missing field', () => {
      const object = {
        translations: {
          en: { name: 'English Name' },
        },
      }
      const result = extractTranslated(object, 'description', 'en')
      expect(result).toBeUndefined()
    })

    it('should return undefined for missing nested field', () => {
      const object = {
        translations: {
          en: {
            product: {
              title: 'Product Title',
            },
          },
        },
      }
      const result = extractTranslated(object, 'product.description', 'en')
      expect(result).toBeUndefined()
    })

    it('should return undefined for null object', () => {
      const result = extractTranslated(null, 'name', 'en')
      expect(result).toBeUndefined()
    })

    it('should return undefined for undefined object', () => {
      const result = extractTranslated(undefined, 'name', 'en')
      expect(result).toBeUndefined()
    })

    it('should return undefined for object without translations', () => {
      const object = { name: 'Name' } as any
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBeUndefined()
    })

    it('should return undefined for empty translations', () => {
      const object = {
        translations: {},
      }
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBeUndefined()
    })

    it('should handle non-string values by returning undefined', () => {
      const object = {
        translations: {
          en: { count: 42 },
        },
      }
      const result = extractTranslated(object, 'count', 'en')
      expect(result).toBeUndefined()
    })

    it('should handle boolean values by returning undefined', () => {
      const object = {
        translations: {
          en: { active: true },
        },
      }
      const result = extractTranslated(object, 'active', 'en')
      expect(result).toBeUndefined()
    })

    it('should handle array values by returning undefined', () => {
      const object = {
        translations: {
          en: { items: ['a', 'b', 'c'] },
        },
      }
      const result = extractTranslated(object, 'items', 'en')
      expect(result).toBeUndefined()
    })

    it('should extract multiple fields from same object', () => {
      const object = {
        translations: {
          en: {
            name: 'Product Name',
            description: 'Product Description',
          },
        },
      }
      expect(extractTranslated(object, 'name', 'en')).toBe('Product Name')
      expect(extractTranslated(object, 'description', 'en')).toBe('Product Description')
    })

    it('should handle empty string values', () => {
      const object = {
        translations: {
          en: { name: '' },
        },
      }
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBe('')
    })

    it('should handle whitespace-only string values', () => {
      const object = {
        translations: {
          en: { name: '   ' },
        },
      }
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBe('   ')
    })
  })
})
