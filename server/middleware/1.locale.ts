import { getCookie } from 'h3'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '~~/i18n/locales'

export default defineEventHandler((event) => {
  let locale: string = DEFAULT_LOCALE

  // Priority 1: Check query parameter (e.g., ?locale=en)
  const query = getQuery(event)
  if (query.locale && typeof query.locale === 'string') {
    locale = query.locale
  }
  else {
    // Priority 2: Check i18n cookies
    const i18nRedirected = getCookie(event, 'i18n_redirected')
    const i18nLocale = getCookie(event, 'i18n_locale')

    if (i18nRedirected) {
      locale = i18nRedirected
    }
    else if (i18nLocale) {
      locale = i18nLocale
    }
    else {
      // Priority 3: Check Accept-Language header
      const acceptLanguage = getHeader(event, 'accept-language')
      if (acceptLanguage) {
        // Parse the first language from Accept-Language header
        // Format: "en-US,en;q=0.9,el;q=0.8"
        const firstLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase()
        if (firstLang && SUPPORTED_LOCALES.includes(firstLang as any)) {
          locale = firstLang
        }
      }
    }
  }

  // Store locale in event context for use in API routes
  console.debug(`[Locale] Locale Middleware Detected: ${locale}`)
  event.context.locale = locale
})
