import { describe, expect, it } from 'vitest'
import { hasVisibleContent, translatedLocales } from '~~/shared/utils/translations'

/**
 * A translation is written when its field shows something: text, or an
 * embedded image or video. A key saved with an emptied editor (`""`,
 * `<p></p>`, TinyMCE's `<p>&nbsp;</p>`) is no document in that
 * language, and everything that lists a page's languages — its hreflang
 * set, the sitemap — must say so.
 */
describe('hasVisibleContent', () => {
  it.each([
    ['text', 'Όροι', true],
    ['markup around text', '<p>κείμενο</p>', true],
    ['an empty string', '', false],
    ['whitespace', '  \n', false],
    ['an empty paragraph', '<p></p>', false],
    ['markup around whitespace', '<p> <br> </p>', false],
    ['an emptied TinyMCE field', '<p>&nbsp;</p>', false],
    ['numeric non-breaking spaces', '<p>&#160;&#xA0;</p>', false],
    ['an image alone', '<p><img src="/size-chart.png" alt=""></p>', true],
    ['an embedded video alone', '<iframe src="https://www.youtube.com/embed/x"></iframe>', true],
    ['an entity that is text', '<p>&amp;</p>', true],
    ['undefined', undefined, false],
    ['null', null, false],
  ])('%s → %s', (_case, value, expected) => {
    expect(hasVisibleContent(value)).toBe(expected)
  })
})

describe('translatedLocales', () => {
  it('lists the locales whose field is written, not every key', () => {
    expect(translatedLocales({
      el: { title: 'Όροι', body: '<p>κείμενο</p>' },
      en: { title: 'Terms', body: '<p></p>' },
      de: { title: 'AGB' },
    }, 'body')).toEqual(['el'])
  })

  it('reads one field only', () => {
    expect(translatedLocales({ en: { title: 'Terms', body: '' } }, 'title')).toEqual(['en'])
  })

  it.each([
    ['no translations', null],
    ['an empty map', {}],
    ['a missing entry', { en: undefined }],
    ['a non-string value', { en: { body: 42 } }],
  ])('is empty for %s', (_case, translations) => {
    expect(translatedLocales(translations as never, 'body')).toEqual([])
  })
})
