import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
/**
 * Plain `{ value }` holders, not refs: the setup plugin watches
 * `loggedIn` and would run its own sign-in chain (which calls
 * `syncFromUser`) against these mocks whenever a test signs in.
 * That watcher is inert here on purpose: the plugin's sign-in chain is
 * not what these specs test.
 */
const { session } = vi.hoisted(() => ({
  session: {
    loggedIn: { value: false },
    user: { value: null as { id: number, languageCode?: string } | null },
    fetch: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  },
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useUserSession', () => () => session)

function signIn(languageCode?: string) {
  session.loggedIn.value = true
  session.user.value = { id: 7, languageCode }
}

/** The `languageCode` field of each account PATCH. */
function savedLanguages() {
  return api.callsTo('/api/user/account/7').map(({ options }) => {
    expect(options.method).toBe('PATCH')
    return (options.body as FormData).get('languageCode')
  })
}

describe('useUserLanguage', () => {
  let setLocale: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    session.loggedIn.value = false
    session.user.value = null
    // The real setLocale also navigates to the locale's prefix; the
    // composable's contract ends at asking for the switch.
    setLocale = vi.spyOn(useNuxtApp().$i18n, 'setLocale').mockResolvedValue(undefined)
  })

  describe('setLanguage', () => {
    it('refuses a locale the build does not ship', async () => {
      signIn('el')

      await expect(useUserLanguage().setLanguage('fr')).resolves.toBe(false)

      expect(setLocale).not.toHaveBeenCalled()
      expect(savedLanguages()).toEqual([])
    })

    it('switches the UI for a visitor without saving anything', async () => {
      await expect(useUserLanguage().setLanguage('en')).resolves.toBe(true)

      expect(setLocale).toHaveBeenCalledExactlyOnceWith('en')
      expect(api).not.toHaveBeenCalled()
    })

    it('saves the new language on the account and refreshes the session', async () => {
      signIn('el')

      await expect(useUserLanguage().setLanguage('en')).resolves.toBe(true)

      expect(setLocale).toHaveBeenCalledExactlyOnceWith('en')
      expect(savedLanguages()).toEqual(['en'])
      expect(session.fetch).toHaveBeenCalledOnce()
    })

    it('does not save a language the account already has', async () => {
      signIn('en')

      await expect(useUserLanguage().setLanguage('en')).resolves.toBe(true)

      expect(setLocale).toHaveBeenCalledExactlyOnceWith('en')
      expect(savedLanguages()).toEqual([])
      expect(session.fetch).not.toHaveBeenCalled()
    })

    it('reports a failed save, after switching the UI', async () => {
      signIn('el')
      api.routes({ '/api/user/account/7': () => { throw new Error('500') } })

      await expect(useUserLanguage().setLanguage('en')).resolves.toBe(false)

      expect(setLocale).toHaveBeenCalledExactlyOnceWith('en')
      expect(session.fetch).not.toHaveBeenCalled()
    })
  })

  describe('syncFromUser', () => {
    it('switches the UI to the language stored on the account', async () => {
      signIn('en')

      await useUserLanguage().syncFromUser()

      expect(setLocale).toHaveBeenCalledExactlyOnceWith('en')
    })

    it.each([
      ['a signed-out visitor', () => { session.user.value = { id: 7, languageCode: 'en' } }],
      ['an account with no stored language', () => signIn(undefined)],
      ['a stored language the build does not ship', () => signIn('de')],
      ['the language already shown', () => signIn(useNuxtApp().$i18n.locale.value)],
    ])('leaves the UI alone for %s', async (_case, arrange) => {
      arrange()

      await useUserLanguage().syncFromUser()

      expect(setLocale).not.toHaveBeenCalled()
    })
  })
})
