import { getCookie } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { tenantAllowedLocales } from '~~/shared/i18n/tenantLocales'

export default defineEventHandler((event) => {
  if (event.path.startsWith('/_nuxt') || event.path.startsWith('/_ipx') || event.path.startsWith('/assets')) return

  // Candidates are validated against the TENANT's locales, not the
  // platform-wide list. Validating against the platform list would let
  // an `en` cookie or an English Accept-Language header select a locale
  // a Greek-only store does not serve — i18n would then redirect that
  // visitor to /en/**, which the route guard 404s. Clamping here is
  // what keeps legitimate traffic on the tenant's own language.
  const tenant = event.context.tenant as TenantConfig | undefined
  const allowed = tenantAllowedLocales(tenant)
  const isAllowed = (code: string | undefined | null): boolean =>
    !!code && allowed.includes(code)

  let locale: string = allowed.includes(DEFAULT_LOCALE)
    ? DEFAULT_LOCALE
    : (allowed[0] ?? DEFAULT_LOCALE)

  // Priority 1: Query parameter — explicit user choice (e.g., ?locale=en)
  const query = getQuery(event)
  if (query.locale && typeof query.locale === 'string' && isAllowed(query.locale)) {
    locale = query.locale
  }
  else {
    // Priority 2: i18n cookies — returning user's previously selected locale
    const i18nRedirected = getCookie(event, 'i18n_redirected')
    const i18nLocale = getCookie(event, 'i18n_locale')

    if (isAllowed(i18nRedirected)) {
      locale = i18nRedirected as string
    }
    else if (isAllowed(i18nLocale)) {
      locale = i18nLocale as string
    }
    else {
      // Priority 3: Tenant default locale — the store owner's configured language.
      // This runs after cookies so that a returning user's explicit language choice
      // (set via the language picker and persisted in a cookie) is still honoured.
      // Note: event.context.tenant is set by middleware 0.tenant.ts which runs
      // before this middleware (lower number = higher priority).
      const tenantLocale = tenant?.defaultLocale
      if (isAllowed(tenantLocale)) {
        locale = tenantLocale as string
      }
      else {
        // Priority 4: Accept-Language header — browser/OS default
        const acceptLanguage = getHeader(event, 'accept-language')
        if (acceptLanguage) {
          const firstLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase()
          if (isAllowed(firstLang)) {
            locale = firstLang as string
          }
        }
      }
    }
  }

  event.context.locale = locale
})
