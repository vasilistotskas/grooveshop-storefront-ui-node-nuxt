import { getCookie } from 'h3'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '~~/i18n/locales'

export default defineEventHandler((event) => {
  if (event.path.startsWith('/_nuxt') || event.path.startsWith('/_ipx') || event.path.startsWith('/assets')) return

  let locale: string = DEFAULT_LOCALE

  // Priority 1: Query parameter — explicit user choice (e.g., ?locale=en)
  const query = getQuery(event)
  if (query.locale && typeof query.locale === 'string' && SUPPORTED_LOCALES.includes(query.locale as any)) {
    locale = query.locale
  }
  else {
    // Priority 2: i18n cookies — returning user's previously selected locale
    const i18nRedirected = getCookie(event, 'i18n_redirected')
    const i18nLocale = getCookie(event, 'i18n_locale')

    if (i18nRedirected && SUPPORTED_LOCALES.includes(i18nRedirected as any)) {
      locale = i18nRedirected
    }
    else if (i18nLocale && SUPPORTED_LOCALES.includes(i18nLocale as any)) {
      locale = i18nLocale
    }
    else {
      // Priority 3: Tenant default locale — the store owner's configured language.
      // This runs after cookies so that a returning user's explicit language choice
      // (set via the language picker and persisted in a cookie) is still honoured.
      // Note: event.context.tenant is set by middleware 0.tenant.ts which runs
      // before this middleware (lower number = higher priority).
      const tenantLocale = (event.context.tenant as TenantConfig | undefined)?.defaultLocale
      if (tenantLocale && SUPPORTED_LOCALES.includes(tenantLocale as any)) {
        locale = tenantLocale
      }
      else {
        // Priority 4: Accept-Language header — browser/OS default
        const acceptLanguage = getHeader(event, 'accept-language')
        if (acceptLanguage) {
          const firstLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase()
          if (firstLang && SUPPORTED_LOCALES.includes(firstLang as any)) {
            locale = firstLang
          }
        }
      }
    }
  }

  event.context.locale = locale
})
