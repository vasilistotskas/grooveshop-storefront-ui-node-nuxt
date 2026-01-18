export default defineI18nLocaleDetector((event, config) => {
  let locale: string = config.defaultLocale

  // Priority 1: Check query parameter (e.g., ?locale=en)
  const queryLocale = tryQueryLocale(event, { lang: 'locale' })
  if (queryLocale) {
    locale = queryLocale.toString()
  }
  else {
    // Priority 2: Check cookie
    const cookieLocale = tryCookieLocale(event, { lang: '', name: 'i18n_redirected' }) || tryCookieLocale(event, { lang: '', name: 'i18n_locale' })
    if (cookieLocale) {
      locale = cookieLocale.toString()
    }
    else {
      // Priority 3: Check Accept-Language header
      const headerLocale = tryHeaderLocale(event, { lang: '' })
      if (headerLocale) {
        locale = headerLocale.toString()
      }
    }
  }

  // Store locale in event context for use in server routes
  console.info(`[Locale] Locale Detector Detected: ${locale}`)
  event.context.locale = locale

  return locale
})
