import { COOKIE_ID_SEPARATOR } from '#cookie-control/types'
import { getAllCookieIdsString, getCookieIds, removeCookie } from '#cookie-control/methods'

/**
 * The visitor's cookie decision, for the platform's banner and
 * preferences (`Chrome/CookieConsent.vue`, `Cookie/Preferences.vue`).
 *
 * The state is the cookie-control plugin's (`useCookieControl`) and the
 * categories are `cookieControl` in nuxt.config.ts — both shared with
 * webside, whose banner (`Cookie/Control.vue`) keeps its own copy of
 * this logic.
 */
export function useCookieConsent() {
  const { cookiesEnabled, cookiesEnabledIds, isConsentGiven, moduleOptions } = useCookieControl()

  /** Decide: the necessary categories, plus the optional ones named. */
  function save(optionalIds: readonly string[]) {
    isConsentGiven.value = true
    cookiesEnabled.value = [
      ...moduleOptions.cookies.necessary,
      ...moduleOptions.cookies.optional.filter(cookie => optionalIds.includes(cookie.id)),
    ]
    cookiesEnabledIds.value = getCookieIds(cookiesEnabled.value)
  }

  return {
    acceptAll: () => save(getCookieIds(moduleOptions.cookies.optional)),
    necessaryOnly: () => save([]),
    save,
  }
}

/**
 * Keeps the browser in step with the decision: the two consent cookies
 * the plugin reads back on the next visit, and the scripts and cookies
 * each category governs. Run it once, from the component that hosts the
 * banner.
 */
export function useCookieConsentSync() {
  const { cookiesEnabled, isConsentGiven, moduleOptions } = useCookieControl()
  const allCookieIdsString = getAllCookieIdsString(moduleOptions)

  // Computed on the client only, so `Date.now()` cannot differ between
  // the server render and hydration.
  const expires = import.meta.client
    ? new Date(Date.now() + moduleOptions.cookieExpiryOffsetMs)
    : undefined
  const consentCookie = useCookie(moduleOptions.cookieNameIsConsentGiven, {
    expires,
    ...moduleOptions.cookieOptions,
  })
  const enabledIdsCookie = useCookie(moduleOptions.cookieNameCookiesEnabledIds, {
    expires,
    ...moduleOptions.cookieOptions,
  })

  watch(cookiesEnabled, (current) => {
    const enabled = current ?? []
    enabledIdsCookie.value = isConsentGiven.value
      ? getCookieIds(enabled).join(COOKIE_ID_SEPARATOR)
      : undefined

    if (!import.meta.client) return

    if (isConsentGiven.value) {
      for (const src of enabled.flatMap(cookie => cookie.src ?? [])) {
        if (document.head.querySelector(`script[src="${src}"]`)) continue
        const script = document.createElement('script')
        script.src = src
        document.head.appendChild(script)
      }
    }

    for (const cookie of moduleOptions.cookies.optional.filter(optional => !enabled.includes(optional))) {
      for (const id of cookie.targetCookieIds ?? []) removeCookie(id)
      for (const src of [cookie.src ?? []].flat()) {
        document.head.querySelectorAll(`script[src="${src}"]`).forEach(script => script.remove())
      }
    }
  }, { deep: true, immediate: true })

  watch(isConsentGiven, (current) => {
    consentCookie.value = current === undefined
      ? undefined
      : current ? allCookieIdsString : '0'
  })
}
