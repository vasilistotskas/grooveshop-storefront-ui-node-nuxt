import { describe, expect, it } from 'vitest'
import {
  announcementShortText,
  announcementText,
  announcementTexts,
  announcementTokens,
  fillAnnouncementTokens,
  missingAnnouncementTokens,
} from '~~/shared/utils/announcementBar'

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

describe('announcement tokens', () => {
  it('lists the figures the wording names, each once, and not another word in braces', () => {
    expect(announcementTokens(['Over {freeShippingThreshold} or {freeShippingThreshold}', 'Before {dispatchCutoff} {WELCOME} {}'])).toEqual([
      'freeShippingThreshold',
      'dispatchCutoff',
    ])
  })

  it('collects the wording of every language, the phone copy included', () => {
    const texts = announcementTexts({
      enabled: true,
      text: 'a',
      shortText: 'b',
      i18n: { en: { text: 'c' }, de: { shortText: 'd' }, fr: {} },
    })

    expect(texts).toEqual(['a', 'b', 'c', 'd'])
  })

  it('replaces a figure that has a value and nothing else', () => {
    expect(fillAnnouncementTokens('Over {freeShippingThreshold}, before {dispatchCutoff}, code {WELCOME}', { freeShippingThreshold: '39,90 €' }))
      .toBe('Over 39,90 €, before {dispatchCutoff}, code {WELCOME}')
  })

  it('names the figures with no value, which hide the bar', () => {
    const texts = ['Over {freeShippingThreshold}', 'Before {dispatchCutoff}']

    expect(missingAnnouncementTokens(texts, { dispatchCutoff: '15:00' })).toEqual(['freeShippingThreshold'])
    expect(missingAnnouncementTokens(texts, { dispatchCutoff: '15:00', freeShippingThreshold: '39,90 €' })).toEqual([])
    expect(missingAnnouncementTokens(['No figures {here}'], {})).toEqual([])
  })
})
