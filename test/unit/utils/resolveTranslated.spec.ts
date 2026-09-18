import { describe, expect, it } from 'vitest'
import { resolveTranslated } from '~/utils/translate'

/**
 * `resolveTranslated` answers a different question from
 * `extractTranslated`: not "is there a translation in THIS locale" but
 * "in which locale does this field exist", so a caller can render the
 * document it has and say which language it is in — instead of
 * treating a missing translation as a missing document.
 */

const page = {
  translations: {
    el: { title: 'Όροι Χρήσης', body: '<p>κείμενο</p>' },
    en: { title: 'Terms', body: '' },
  },
}

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
    const blank = { translations: { en: { body: '<p> </p>' }, el: { body: '<p>ok</p>' } } }

    expect(resolveTranslated(blank, 'body', 'en', ['el'])?.locale).toBe('el')
  })

  it('tries the remaining locales when none of the preferred ones exist', () => {
    const deOnly = { translations: { de: { title: 'AGB' } } }

    expect(resolveTranslated(deOnly, 'title', 'en', ['el'])).toEqual({
      value: 'AGB',
      locale: 'de',
    })
  })

  it('is undefined when the field exists in no locale', () => {
    expect(resolveTranslated(page, 'body', 'de', ['fr'])?.value).toBe('<p>κείμενο</p>')
    expect(resolveTranslated({ translations: {} }, 'title', 'en', ['el'])).toBeUndefined()
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
