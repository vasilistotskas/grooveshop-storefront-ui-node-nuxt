import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { asProxiedError, makeAllAuthConfig, makeBadResponse, makePendingFlowResponse } from '~~/test/fixtures/allauth'

/**
 * `setupSocialLogin`: Google One Tap signs a visitor in from Google's own
 * script. Its credential callback runs outside any component, so a
 * refused sign-in must still be handled there — a pending flow is the
 * next step, anything else is told to the visitor — instead of escaping
 * into Google's script as an unhandled rejection.
 */
const { providerToken, navigateToMock, toastAdd, gsi } = vi.hoisted(() => {
  const gsi = {
    callback: undefined as undefined | ((response: { credential: string }) => Promise<void>),
    onLoaded: (loaded: () => void) => loaded(),
    instance: {},
    proxy: {
      initialize(options: { callback: (response: { credential: string }) => Promise<void> }) {
        gsi.callback = options.callback
      },
      prompt: () => {},
    },
  }
  return { providerToken: vi.fn(), navigateToMock: vi.fn(), toastAdd: vi.fn(), gsi }
})
mockNuxtImport('useScript', () => () => gsi)
mockNuxtImport('useAllAuthAuthentication', () => () => ({ providerToken }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const Harness = defineComponent({
  setup() {
    setupSocialLogin()
    return () => h('div')
  },
})

describe('setupSocialLogin', () => {
  let gsiEnabled: unknown

  beforeEach(() => {
    const config = useRuntimeConfig().public
    gsiEnabled = config.googleGsiEnable
    config.googleGsiEnable = true
    useAuthStore().config = makeAllAuthConfig().data
    gsi.callback = undefined
  })

  afterEach(() => {
    useRuntimeConfig().public.googleGsiEnable = gsiEnabled as boolean
  })

  /** Answer the One Tap prompt the way Google calls back. */
  async function answerPrompt() {
    await mountSuspended(Harness, { route: false })
    expect(gsi.callback).toBeTypeOf('function')
    const settled = gsi.callback!({ credential: 'google-id-token' })
    await flushPromises()
    return settled
  }

  it('signs the visitor in with the Google credential', async () => {
    providerToken.mockResolvedValue({})

    await answerPrompt()

    expect(providerToken).toHaveBeenCalledWith({
      provider: 'google',
      token: { id_token: 'google-id-token', client_id: '' },
      process: 'login',
    })
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('moves a first-time Google visitor on to the signup step', async () => {
    providerToken.mockRejectedValue(asProxiedError(makePendingFlowResponse('provider_signup')))

    await expect(answerPrompt()).resolves.toBeUndefined()

    expect(navigateToMock).toHaveBeenCalledWith(expect.objectContaining({ path: '/account/provider/signup' }))
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('tells the visitor why a refused sign-in failed', async () => {
    providerToken.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'invalid_token', message: 'Invalid token.' })))

    await expect(answerPrompt()).resolves.toBeUndefined()

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
