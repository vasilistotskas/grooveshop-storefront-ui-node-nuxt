import { describe, expect, it } from 'vitest'
import { websiteTranslations } from '~/utils/websiteTranslations'

const websiteId = (locale: string) => `https://store.example/${locale === 'el' ? '' : locale}#website`

describe('websiteTranslations', () => {
  it('names no translation for a store that serves one language', () => {
    expect(websiteTranslations('el', ['el'], websiteId)).toEqual({})
  })

  it('names each other language the store serves from the original site', () => {
    expect(websiteTranslations('el', ['el', 'en'], websiteId)).toEqual({
      workTranslation: [{ '@type': 'WebSite', '@id': 'https://store.example/en#website' }],
    })
  })

  it('points a translated site back at the original', () => {
    expect(websiteTranslations('en', ['el', 'en'], websiteId)).toEqual({
      translationOfWork: { '@type': 'WebSite', '@id': 'https://store.example/#website' },
    })
  })

  // `DEFAULT_LOCALE` renders `/` whether or not the store lists it.
  it('keeps the unprefixed site as the original when the store lists only another language', () => {
    expect(websiteTranslations('el', ['en'], websiteId)).toEqual({
      workTranslation: [{ '@type': 'WebSite', '@id': 'https://store.example/en#website' }],
    })
  })
})
