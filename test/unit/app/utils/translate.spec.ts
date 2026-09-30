import { describe, it, expect } from 'vitest'
import { extractTranslated, resolveTranslated } from '~/utils/translate'
import type { TranslationObject } from '~~/shared/types/utility'

/**
 * A parler row as Django serialises it: the translated fields exist only
 * under `translations`. `TranslationObject<T>` also demands `T`'s fields
 * at the root (`& Omit<T, 'translations'>`), which no real row has — the
 * generated models satisfy it only because every translated field is
 * optional — so the row is asserted to that type rather than given
 * invented root fields.
 */
function row<T extends object>(translations: Record<string, T>): TranslationObject<T> {
  return { translations } as TranslationObject<T>
}

describe('Translate Utils', () => {
  describe('extractTranslated', () => {
    it('should extract simple field translation', () => {
      const object = row({
        en: { name: 'English Name' },
        el: { name: 'Greek Name' },
      })
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBe('English Name')
    })

    it('should extract translation for different locale', () => {
      const object = row({
        en: { name: 'English Name' },
        el: { name: 'Greek Name' },
      })
      const result = extractTranslated(object, 'name', 'el')
      expect(result).toBe('Greek Name')
    })

    it('should extract nested field translation', () => {
      const object = row({
        en: {
          product: {
            title: 'Product Title',
          },
        },
      })
      const result = extractTranslated(object, 'product.title', 'en')
      expect(result).toBe('Product Title')
    })

    it('should extract deeply nested field translation', () => {
      const object = row({
        en: {
          level1: {
            level2: {
              level3: 'Deep Value',
            },
          },
        },
      })
      const result = extractTranslated(object, 'level1.level2.level3', 'en')
      expect(result).toBe('Deep Value')
    })

    it('should return undefined for missing locale', () => {
      const object = row({
        en: { name: 'English Name' },
      })
      const result = extractTranslated(object, 'name', 'fr')
      expect(result).toBeUndefined()
    })

    it('should return undefined for missing field', () => {
      const object = row<{ name: string, description?: string }>({
        en: { name: 'English Name' },
      })
      const result = extractTranslated(object, 'description', 'en')
      expect(result).toBeUndefined()
    })

    it('should return undefined for missing nested field', () => {
      const object = row<{ product: { title: string, description?: string } }>({
        en: {
          product: {
            title: 'Product Title',
          },
        },
      })
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
      const object = row<{ name?: string }>({})
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBeUndefined()
    })

    it('should handle non-string values by returning undefined', () => {
      const object = row({
        en: { count: 42 },
      })
      const result = extractTranslated(object, 'count', 'en')
      expect(result).toBeUndefined()
    })

    it('should handle boolean values by returning undefined', () => {
      const object = row({
        en: { active: true },
      })
      const result = extractTranslated(object, 'active', 'en')
      expect(result).toBeUndefined()
    })

    it('should handle array values by returning undefined', () => {
      const object = row({
        en: { items: ['a', 'b', 'c'] },
      })
      const result = extractTranslated(object, 'items', 'en')
      expect(result).toBeUndefined()
    })

    it('should extract multiple fields from same object', () => {
      const object = row({
        en: {
          name: 'Product Name',
          description: 'Product Description',
        },
      })
      expect(extractTranslated(object, 'name', 'en')).toBe('Product Name')
      expect(extractTranslated(object, 'description', 'en')).toBe('Product Description')
    })

    it('should handle empty string values', () => {
      const object = row({
        en: { name: '' },
      })
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBe('')
    })

    it('should handle whitespace-only string values', () => {
      const object = row({
        en: { name: '   ' },
      })
      const result = extractTranslated(object, 'name', 'en')
      expect(result).toBe('   ')
    })
  })
})

/**
 * `resolveTranslated` answers a different question from
 * `extractTranslated`: not "is there a translation in THIS locale" but
 * "in which locale does this field exist", so a caller can render the
 * document it has and say which language it is in — instead of
 * treating a missing translation as a missing document.
 */

const page = row({
  el: { title: 'Όροι Χρήσης', body: '<p>κείμενο</p>' },
  en: { title: 'Terms', body: '' },
})

describe('resolveTranslated', () => {
  it('returns the requested locale when it exists', () => {
    expect(resolveTranslated(page, 'title', 'en')).toEqual({
      value: 'Terms',
      locale: 'en',
    })
  })

  it('falls back in the order given, and reports which locale it used', () => {
    // The English body is EMPTY, so the Greek one is served — and the
    // caller learns it is Greek, to mark `lang`, canonical and a notice.
    expect(resolveTranslated(page, 'body', 'en', ['el'])).toEqual({
      value: '<p>κείμενο</p>',
      locale: 'el',
    })
  })

  it('treats a row with only markup as absent', () => {
    // A translation saved as `<p></p>` is as unusable as none, and the
    // legal routes 404 on it.
    const blank = row({ en: { body: '<p> </p>' }, el: { body: '<p>ok</p>' } })

    expect(resolveTranslated(blank, 'body', 'en', ['el'])?.locale).toBe('el')
  })

  it('tries the remaining locales when none of the preferred ones exist', () => {
    const deOnly = row({ de: { title: 'AGB' } })

    expect(resolveTranslated(deOnly, 'title', 'en', ['el'])).toEqual({
      value: 'AGB',
      locale: 'de',
    })
  })

  it('finds a field in a locale neither asked for nor listed as a fallback', () => {
    expect(resolveTranslated(page, 'body', 'de', ['fr'])).toEqual({ value: '<p>κείμενο</p>', locale: 'el' })
  })

  it('is undefined when the field exists in no locale', () => {
    expect(resolveTranslated(row<{ title?: string }>({}), 'title', 'en', ['el'])).toBeUndefined()
    expect(resolveTranslated(null, 'title', 'en')).toBeUndefined()
  })

  it('never tries the same locale twice', () => {
    // Requested locale repeated in the fallbacks must not change the
    // answer or the order.
    expect(resolveTranslated(page, 'title', 'el', ['el', 'en'])).toEqual({
      value: 'Όροι Χρήσης',
      locale: 'el',
    })
  })
})
