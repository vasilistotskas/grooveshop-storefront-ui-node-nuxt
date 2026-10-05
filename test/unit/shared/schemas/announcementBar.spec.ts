import { describe, expect, it } from 'vitest'

import {
  announcementShortText,
  announcementText,
  isAnnouncementBar,
  parseAnnouncementBarValue,
} from '../../../../shared/schemas/announcementBar'

/**
 * The render-time mirror of Django's `validate_announcement_bar_setting`:
 * a shape the write side refuses must be refused here too, and one it
 * accepts must render.
 */
const bar = (extra: Record<string, unknown> = {}) => ({
  enabled: true,
  text: 'Δωρεάν αποστολή',
  ...extra,
})

describe('code', () => {
  it.each(['WELCOME10', 'A', 'x'.repeat(40)])('accepts %s', (code) => {
    expect(isAnnouncementBar(bar({ code }))).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['with a space', 'WELCOME 10'],
    ['with a tab', 'WELCOME\t10'],
    ['41 characters', 'x'.repeat(41)],
    ['not a string', 10],
  ])('refuses a code that is %s', (_name, code) => {
    expect(isAnnouncementBar(bar({ code }))).toBe(false)
  })

  it('is not a per-locale key', () => {
    expect(isAnnouncementBar(bar({ i18n: { en: { code: 'X' } } }))).toBe(false)
  })
})

describe('shortText', () => {
  it('accepts up to 80 characters', () => {
    expect(isAnnouncementBar(bar({ shortText: 'x'.repeat(80) }))).toBe(true)
  })

  it('refuses 81', () => {
    expect(isAnnouncementBar(bar({ shortText: 'x'.repeat(81) }))).toBe(false)
  })
})

describe('per-locale overrides', () => {
  it('may hold text, shortText or both, but not nothing', () => {
    expect(isAnnouncementBar(bar({ i18n: { en: { text: 'Free' } } }))).toBe(true)
    expect(isAnnouncementBar(bar({ i18n: { en: { shortText: 'Free' } } }))).toBe(true)
    expect(isAnnouncementBar(bar({ i18n: { en: { text: 'Free', shortText: 'F' } } }))).toBe(true)
    expect(isAnnouncementBar(bar({ i18n: { en: {} } }))).toBe(false)
  })

  it('keeps each field to its own limit', () => {
    expect(isAnnouncementBar(bar({ i18n: { en: { shortText: 'x'.repeat(81) } } }))).toBe(false)
    expect(isAnnouncementBar(bar({ i18n: { en: { text: 'x'.repeat(201) } } }))).toBe(false)
  })

  it('refuses an unknown key', () => {
    expect(isAnnouncementBar(bar({ i18n: { en: { text: 'a', title: 'b' } } }))).toBe(false)
  })
})

describe('parseAnnouncementBarValue', () => {
  it('keeps code and shortText', () => {
    expect(parseAnnouncementBarValue(JSON.stringify(bar({ code: 'WELCOME10', shortText: 'Free' }))))
      .toMatchObject({ code: 'WELCOME10', shortText: 'Free' })
  })
})

describe('announcementText / announcementShortText', () => {
  const value = {
    enabled: true,
    text: 'el long',
    shortText: 'el short',
    i18n: { en: { text: 'en long' }, de: { text: 'de long', shortText: 'de short' } },
  }

  it('reads the locale\'s own wording', () => {
    expect(announcementText(value, 'de')).toBe('de long')
    expect(announcementShortText(value, 'de')).toBe('de short')
  })

  it('reads the default wording where the locale has no override', () => {
    expect(announcementShortText(value, 'el')).toBe('el short')
  })

  it('never lends the default locale\'s short copy to another language', () => {
    expect(announcementShortText(value, 'en')).toBe('')
  })

  it('is empty when there is no short copy', () => {
    expect(announcementShortText({ enabled: true, text: 'x' }, 'el')).toBe('')
  })
})
