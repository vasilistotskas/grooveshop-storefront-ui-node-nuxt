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
    ['an inline svg', '<svg viewBox="0 0 1 1"></svg>', true],
    ['an image beside an emptied paragraph', '<p>&nbsp;</p><img src="a.png">', true],
    ['an entity that is text', '<p>&amp;</p>', true],
    ['undefined', undefined, false],
    ['null', null, false],
  ])('%s → %s', (_case, value, expected) => {
    expect(hasVisibleContent(value)).toBe(expected)
  })

  // The cases of Django's TestHasVisibleContent (`core/utils/sanitize.py`):
  // one rule on both sides, since Django fills `translatedLocales` with it.
  describe('as Django reads it', () => {
    it.each([
      [null],
      [''],
      ['<p></p>'],
      ['<p>&nbsp;</p>'],
      ['<p> &#160; </p>'],
    ])('shows nothing for empty markup %j', (html) => {
      expect(hasVisibleContent(html)).toBe(false)
    })

    it.each([
      ['<p>a</p>'],
      ['text'],
      ['<p><img src="a.png"></p>'],
    ])('shows text or media %j', (html) => {
      expect(hasVisibleContent(html)).toBe(true)
    })

    it.each([
      ['<p hidden>Draft</p>'],
      ['<div hidden=""><p>a</p><img src="a.png"></div>'],
      ['<div hidden><div>x</div></div><p>&nbsp;</p>'],
      ['<div HIDDEN><svg></svg></div>'],
    ])('shows nothing inside a hidden element %j', (html) => {
      expect(hasVisibleContent(html)).toBe(false)
    })

    it.each([
      ['<p hidden>a</p><p>b</p>'],
      ['<div hidden><p>a</p></div><img src="a.png">'],
    ])('counts visible content beside hidden content %j', (html) => {
      expect(hasVisibleContent(html)).toBe(true)
    })

    it.each([
      ['<img>'],
      ['<img src="" alt="a">'],
      ['<img src="  ">'],
      ['<iframe></iframe>'],
      ['<p><iframe width="560"></iframe></p>'],
      ['<video controls></video>'],
      ['<object type="application/pdf"></object>'],
      ['<picture><source></picture>'],
    ])('shows nothing for media without a source %j', (html) => {
      expect(hasVisibleContent(html)).toBe(false)
    })

    it.each([
      ['<iframe src="https://www.youtube.com/embed/x"></iframe>'],
      ['<img src="a.png">'],
      ['<video src="a.mp4"></video>'],
      ['<audio src="a.mp3"></audio>'],
      ['<embed src="a.swf">'],
      ['<picture><source src="a.webp"></picture>'],
      ['<object data="a.pdf"></object>'],
    ])('shows media with a source %j', (html) => {
      expect(hasVisibleContent(html)).toBe(true)
    })

    it('does not read a comment or an attribute value as text', () => {
      expect(hasVisibleContent('<!-- note --><p title="a > b">&nbsp;</p>')).toBe(false)
    })

    it('does not hide what follows a self-closed or void element', () => {
      expect(hasVisibleContent('<br hidden><p>a</p>')).toBe(true)
    })
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
