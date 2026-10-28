import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { injectHead } from '#imports'
import { setTenant } from '~~/test/helpers/tenant'
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
const { scriptGoogleAnalytics, loadIdle } = vi.hoisted(() => {
  const loadIdle = { resolve: () => {}, promise: Promise.resolve() }
  return {
    loadIdle,
    scriptGoogleAnalytics: vi.fn((_options: { scriptOptions: { trigger: unknown } }) => ({
      proxy: { gtag: () => {} },
      consent: { update: () => {} },
    })),
  }
})
mockNuxtImport('useScriptGoogleAnalytics', () => scriptGoogleAnalytics)
mockNuxtImport('afterLoadWhenIdle', () => () => loadIdle.promise)
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
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

/**
 * `setupCookieConsentTracking`: the `banner_shown` impression is the
 * denominator of the accept rate, so it is counted only where a banner is
 * drawn. The platform's banner is not drawn for a store with no optional
 * service; a webside store keeps its own banner, which always asks.
 */
const TrackingHarness = defineComponent({
  setup() {
    setupCookieConsentTracking()
    return () => h('div')
  },
})

describe('setupCookieConsentTracking', () => {
  const NONE = { gaTrackingId: '', googleAdsConversionId: '', metaPixelId: '', tiktokPixelId: '', openaiPixelId: '' }

  beforeEach(() => {
    window.sessionStorage.clear()
    useCookieControl().isConsentGiven.value = undefined
    api.routes({ '/api/analytics/cookie-consent': {} })
  })

  const impressions = async (overrides: Record<string, unknown>, schemaName: string) => {
    setTenant({ ...NONE, ...overrides, schemaName })
    await mountSuspended(TrackingHarness, { route: false })
    await flushPromises()
    return api.callsTo('/api/analytics/cookie-consent').filter(call => call.options?.body?.event === 'banner_shown')
  }

  it('counts the impression of a banner that is drawn', async () => {
    expect(await impressions({ metaPixelId: '123' }, 'demo')).toHaveLength(1)
  })

  it('counts nothing for a store whose banner is not drawn', async () => {
    expect(await impressions({}, 'demo')).toHaveLength(0)
  })

  it('still counts a webside store, whose own banner always asks', async () => {
    expect(await impressions({}, 'webside')).toHaveLength(1)
  })
})

/**
 * gtag loads once the page has loaded and is idle, never on the visitor's
 * first tap: its ~180 ms evaluation then landed on their next tap (webside's
 * INP, 2026-10-19).
 */
describe('setupGoogleAnalyticsConsent', () => {
  const GaHarness = defineComponent({
    setup() {
      setupGoogleAnalyticsConsent()
      return () => h('div')
    },
  })

  beforeEach(() => {
    loadIdle.promise = new Promise((resolve) => {
      loadIdle.resolve = resolve
    })
  })

  it('loads the tag when the loaded page is idle, not on the first tap', async () => {
    setTenant({ gaTrackingId: 'G-GGKMZ8YLNN', googleAdsConversionId: '' })
    await mountSuspended(GaHarness, { route: false })
    // The first registration loads the tag; useGoogleAds' later one is 'manual'.
    const trigger = scriptGoogleAnalytics.mock.calls[0]?.[0].scriptOptions.trigger
    let fired = false
    Promise.resolve(trigger).then(() => {
      fired = true
    })

    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('touchstart'))
    await flushPromises()
    expect(fired).toBe(false)

    loadIdle.resolve()
    await flushPromises()
    expect(fired).toBe(true)
  })
})

/**
 * `setupPageHeader`'s connection hints: one preconnect, to the origin the
 * page's images load from, in the mode `<img>` loads in. A hint with
 * `crossorigin` opens an anonymous-CORS socket that a no-cors image
 * request cannot reuse, and the static origin is never fetched by the
 * browser (its paths go through the media origin), so a hint for it is
 * a wasted connection on every page (Lighthouse 2026-10-19, F9).
 */
describe('setupPageHeader connection hints', () => {
  const HeaderHarness = defineComponent({
    setup() {
      setupPageHeader()
      return () => h('div')
    },
  })

  async function connectionHints() {
    const head = injectHead()
    const before = new Set(head.entries.keys())
    await mountSuspended(HeaderHarness, { route: false })
    await flushPromises()
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      head.render()
      vi.runOnlyPendingTimers()
    }
    finally {
      vi.useRealTimers()
    }
    const hints = [...document.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]')]
      .map(link => ({
        rel: link.getAttribute('rel'),
        href: link.getAttribute('href'),
        crossorigin: link.getAttribute('crossorigin'),
      }))
    for (const key of head.entries.keys()) {
      if (!before.has(key)) head.entries.delete(key)
    }
    return hints
  }

  it('preconnects to the store\'s media origin only, without CORS mode', async () => {
    setTenant({ assetsDomain: 'assets.shop.test', staticDomain: 'static.shop.test' })

    expect(await connectionHints()).toEqual([
      { rel: 'dns-prefetch', href: 'https://assets.shop.test', crossorigin: null },
      { rel: 'preconnect', href: 'https://assets.shop.test', crossorigin: null },
    ])
  })
})
