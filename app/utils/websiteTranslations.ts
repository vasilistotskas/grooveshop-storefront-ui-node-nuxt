import { DEFAULT_LOCALE } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'

export interface WebSiteReference {
  '@type': 'WebSite'
  '@id': string
}

export interface WebSiteTranslations {
  workTranslation?: WebSiteReference[]
  translationOfWork?: WebSiteReference
}

/**
 * How the WebSite node of the page's locale relates to the store's other
 * languages: schema.org `workTranslation` on the original, and
 * `translationOfWork` on each translation.
 *
 * The unprefixed site is the original: `DEFAULT_LOCALE` renders `/` on
 * every store (`servedLocale`), so a page in any other locale is its
 * translation, and the original names every other locale THIS store
 * serves. nuxt-schema-org's default WebSite node drew the same relations
 * from the platform's locale list and pointed a Greek-only store at
 * `/en#website`, a page that answers 404.
 */
export function websiteTranslations(
  current: SupportedLocale,
  served: readonly SupportedLocale[],
  websiteId: (locale: SupportedLocale) => string,
): WebSiteTranslations {
  const reference = (locale: SupportedLocale): WebSiteReference => ({ '@type': 'WebSite', '@id': websiteId(locale) })
  if (current !== DEFAULT_LOCALE) return { translationOfWork: reference(DEFAULT_LOCALE) }
  const translations = served.filter(locale => locale !== DEFAULT_LOCALE)
  return translations.length ? { workTranslation: translations.map(reference) } : {}
}
