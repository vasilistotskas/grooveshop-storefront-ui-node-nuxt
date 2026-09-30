import { describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '~~/i18n/locales'
import { newsletterConsent, newsletterConsentText } from '~~/shared/i18n/newsletterConsent'

/**
 * The consent sentence is stored by Django as proof of consent, so the
 * plain text the server sends must be exactly the words the label
 * rendered: `before` + the privacy link's words + `after`. That the
 * label renders these parts is `NewsletterSignup`'s to prove.
 */
describe('newsletterConsent', () => {
  it.each(SUPPORTED_LOCALES)('has a complete sentence in %s', (locale) => {
    const { before, privacy, after } = newsletterConsent(locale)

    // No part may be blank: a missing half stores a consent sentence
    // the shopper never read.
    expect(before.trim()).not.toBe('')
    expect(privacy.trim()).not.toBe('')
    expect(newsletterConsentText(locale)).toBe(`${before}${privacy}${after}`)
  })

  it('differs per locale', () => {
    expect(newsletterConsentText('en')).not.toBe(newsletterConsentText('el'))
  })

  it('stays within what Django accepts (1..500 chars)', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(newsletterConsentText(locale).length).toBeLessThanOrEqual(500)
    }
  })

  it('answers an unknown locale in the default one', () => {
    expect(newsletterConsentText('xx')).toBe(newsletterConsentText(DEFAULT_LOCALE))
  })
})
