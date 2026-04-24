import { SUPPORTED_LOCALES, type SupportedLocale } from '~~/i18n/locales'

/**
 * Single entry point for changing the user's preferred language.
 *
 * Wraps `useI18n().setLocale()` so that:
 * 1. the UI switches immediately (i18n cookie `i18n_redirected` is written
 *    by @nuxtjs/i18n when `detectBrowserLanguage.useCookie` is true),
 * 2. the authenticated user's `language_code` on the Django backend is
 *    kept in sync (PATCH → `/api/user/account/{id}`) so the next email is
 *    rendered under `translation.override(user.language_code)`.
 *
 * Use this composable from any place that lets the user change language
 * (header switcher, account settings, onboarding, etc.) — do NOT call
 * `useI18n().setLocale()` directly in user-facing code.
 *
 * `useI18n()` is resolved lazily inside each method rather than at
 * composable-call time so that callers like `plugins/setup.ts` — which
 * runs before the @nuxtjs/i18n module plugin has finished wiring up
 * `$i18n` during SSR — can still instantiate us without crashing
 * prerender.
 */
export function useUserLanguage() {
  const { user, loggedIn, fetch } = useUserSession()

  const isSupported = (code: string): code is SupportedLocale =>
    (SUPPORTED_LOCALES as readonly string[]).includes(code)

  const setLanguage = async (code: string): Promise<boolean> => {
    if (!isSupported(code)) return false

    // ``useI18n()`` is a setup-scope composable — throws "Must be
    // called at the top of a setup function" when invoked inside
    // async callbacks (e.g. ``watch`` bodies in ``plugins/setup.ts``
    // after an ``await``). ``useNuxtApp().$i18n`` is the
    // plugin-registered instance and is safe to read at any point in
    // the app lifecycle.
    const { $i18n } = useNuxtApp()
    await $i18n.setLocale(code)

    if (loggedIn.value && user.value?.id) {
      const stored = user.value.languageCode
      if (stored === code) return true
      try {
        const form = new FormData()
        form.append('languageCode', code)
        await $fetch(`/api/user/account/${user.value.id}`, {
          method: 'PATCH',
          body: form,
        })
        await fetch()
      }
      catch (error) {
        log.error({ action: 'useUserLanguage:persist', code, error })
        return false
      }
    }

    return true
  }

  /**
   * Force the UI locale to match the user's stored `language_code` after
   * login/session hydration. Silent no-op when they already agree or when
   * the stored value is outside SUPPORTED_LOCALES (e.g. feature flag for
   * a locale the Nuxt build doesn't ship yet).
   */
  const syncFromUser = async (): Promise<void> => {
    if (!loggedIn.value) return
    const stored = user.value?.languageCode
    if (!stored || !isSupported(stored)) return
    // See note above — ``useNuxtApp().$i18n`` is the async-safe
    // accessor; ``useI18n()`` here crashes when called after awaits
    // have detached the callback from the setup scope.
    const { $i18n } = useNuxtApp()
    if (stored === $i18n.locale.value) return
    await $i18n.setLocale(stored)
  }

  return { setLanguage, syncFromUser }
}
