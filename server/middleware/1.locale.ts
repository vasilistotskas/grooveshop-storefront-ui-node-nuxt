import { getCookie } from 'h3'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '~~/i18n/locales'

export default defineEventHandler((event) => {
  if (event.path.startsWith('/_nuxt') || event.path.startsWith('/_ipx') || event.path.startsWith('/assets')) return

  let locale: string = DEFAULT_LOCALE

  // Priority 1: Check query parameter (e.g., ?locale=en)
  const query = getQuery(event)
  if (query.locale && typeof query.locale === 'string' && SUPPORTED_LOCALES.includes(query.locale as any)) {
    locale = query.locale
  }
  else {
    // Priority 2: Check i18n cookies
    const i18nRedirected = getCookie(event, 'i18n_redirected')
    const i18nLocale = getCookie(event, 'i18n_locale')

    if (i18nRedirected && SUPPORTED_LOCALES.includes(i18nRedirected as any)) {
      locale = i18nRedirected
    }
    else if (i18nLocale && SUPPORTED_LOCALES.includes(i18nLocale as any)) {
      locale = i18nLocale
    }
    else {
      // Priority 3: Check Accept-Language header
      const acceptLanguage = getHeader(event, 'accept-language')
      if (acceptLanguage) {
        const firstLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase()
        if (firstLang && SUPPORTED_LOCALES.includes(firstLang as any)) {
          locale = firstLang
        }
      }
    }
  }

  event.context.locale = locale
})
