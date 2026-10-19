import { beforeEach, describe, expect, it } from 'vitest'
import { extractTranslated, translatorFor } from '~/utils/translate'
import type { TranslationObject } from '~~/shared/types/utility'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * `extractTranslated` is what every surface shows: the row in the page's
 * language when it is written in it, else in the store's default language
 * (`TenantConfig.defaultLocale`, read from the app's own store), else in
 * any language it is written in — never a blank because the row is not
 * translated into the page's language. The exact read under it is the
 * unit project's (test/unit/app/utils/translate.spec.ts).
 */
function row<T extends object>(translations: Record<string, T>): TranslationObject<T> {
  return { translations } as TranslationObject<T>
}

const GREEK_ONLY = row({ el: { name: 'Μόνο ελληνικό', description: '<p>Περιγραφή</p>' } })

describe('extractTranslated', () => {
  beforeEach(() => {
    setTenant({ defaultLocale: 'el' })
  })

  it('reads the page\'s language when the row is written in it', () => {
    const product = row({ el: { name: 'Φορτιστής' }, en: { name: 'Charger' } })

    expect(extractTranslated(product, 'name', 'en')).toBe('Charger')
  })

  it('reads the store\'s default language when the row is not written in the page\'s', () => {
    expect(extractTranslated(GREEK_ONLY, 'name', 'en')).toBe('Μόνο ελληνικό')
    expect(extractTranslated(GREEK_ONLY, 'description', 'en')).toBe('<p>Περιγραφή</p>')
  })

  it('counts a translation saved with every field empty as not written', () => {
    const product = row({ el: { name: 'Φορτιστής', seoTitle: '' }, en: { name: '', seoTitle: '<p></p>' } })

    expect(extractTranslated(product, 'name', 'en')).toBe('Φορτιστής')
  })

  // The language is the row's, not the field's: `seoTitle || name` must
  // reach the English name, not the Greek SEO title.
  it('keeps the page\'s language for a field the row left empty in it', () => {
    const product = row({ el: { name: 'Φορτιστής', seoTitle: 'Φορτιστής 65W' }, en: { name: 'Charger', seoTitle: '' } })

    expect(extractTranslated(product, 'seoTitle', 'en')).toBe('')
  })

  it('prefers the store\'s default language to the other languages the row has', () => {
    setTenant({ defaultLocale: 'en' })
    // German first, as parler may list the rows: the store's language still wins.
    const product = row({ de: { name: 'Ladegerät' }, en: { name: 'Charger' } })

    expect(extractTranslated(product, 'name', 'el')).toBe('Charger')
  })

  it('reads any language the row is written in when the store\'s is missing too', () => {
    const product = row({ de: { name: 'Ladegerät' } })

    expect(extractTranslated(product, 'name', 'en')).toBe('Ladegerät')
  })

  it('is undefined when the row is written in no language', () => {
    expect(extractTranslated(row({ el: { name: '' } }), 'name', 'en')).toBeUndefined()
    expect(extractTranslated(null, 'name', 'en')).toBeUndefined()
  })

  it('is what translatorFor hands a helper', () => {
    expect(translatorFor('en')(GREEK_ONLY, 'name')).toBe('Μόνο ελληνικό')
  })
})
