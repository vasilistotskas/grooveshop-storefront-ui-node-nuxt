import { describe, expect, it } from 'vitest'
import { announcementShortText, announcementText } from '~~/shared/utils/announcementBar'

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
