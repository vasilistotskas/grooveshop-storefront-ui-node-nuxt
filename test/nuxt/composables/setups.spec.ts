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
const { scriptGoogleAnalytics, loadIdle, nextPaint, consentUpdate } = vi.hoisted(() => {
  const loadIdle = { resolve: () => {}, promise: Promise.resolve() }
  const nextPaint = { resolve: () => {}, promise: Promise.resolve() }
  const consentUpdate = vi.fn()
  return {
    loadIdle,
    nextPaint,
    consentUpdate,
    scriptGoogleAnalytics: vi.fn((_options: { scriptOptions: { trigger: unknown } }) => ({
      proxy: { gtag: () => {} },
      consent: { update: consentUpdate },
    })),
  }
})
mockNuxtImport('useScriptGoogleAnalytics', () => scriptGoogleAnalytics)
const { metaFbq } = vi.hoisted(() => ({ metaFbq: vi.fn() }))
mockNuxtImport('useScriptMetaPixel', () => () => ({ proxy: { fbq: metaFbq } }))
mockNuxtImport('afterLoadWhenIdle', () => () => loadIdle.promise)
mockNuxtImport('afterNextPaint', () => () => nextPaint.promise)
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
 * drawn. No design's banner is drawn for a store with no optional service.
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

  it('counts the impression of a webside store whose banner is drawn', async () => {
    expect(await impressions({ metaPixelId: '123' }, 'webside')).toHaveLength(1)
  })

  it('counts nothing for a webside store with no optional service', async () => {
    expect(await impressions({}, 'webside')).toHaveLength(0)
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

  /** Whether the tag's load trigger has fired, tracked from now on. */
  async function mountTag() {
    setTenant({ gaTrackingId: 'G-GGKMZ8YLNN', googleAdsConversionId: '' })
    scriptGoogleAnalytics.mockClear()
    await mountSuspended(GaHarness, { route: false })
    // The first registration loads the tag; useGoogleAds' later one is 'manual'.
    const trigger = scriptGoogleAnalytics.mock.calls[0]?.[0].scriptOptions.trigger
    const state = { fired: false }
    Promise.resolve(trigger).then(() => {
      state.fired = true
    })
    return state
  }

  function decide(given: boolean | undefined, ...categories: string[]) {
    const { cookiesEnabledIds, isConsentGiven } = useCookieControl()
    isConsentGiven.value = given
    cookiesEnabledIds.value = categories
  }

  it('sends nothing to Google before the visitor answers', async () => {
    decide(undefined)

    const tag = await mountTag()
    loadIdle.resolve()
    await flushPromises()

    expect(tag.fired).toBe(false)
  })

  it('sends nothing to Google when the visitor refuses both categories', async () => {
    decide(true, 'n', 'functionality_storage')

    const tag = await mountTag()
    loadIdle.resolve()
    await flushPromises()

    expect(tag.fired).toBe(false)
  })

  it.each(['analytics_storage', 'ad_storage'])('loads the tag once %s is granted', async (category) => {
    decide(undefined)
    const tag = await mountTag()
    loadIdle.resolve()

    decide(true, category)
    await flushPromises()

    expect(tag.fired).toBe(true)
  })

  it('loads the tag when the loaded page is idle, not on the first tap', async () => {
    decide(true, 'analytics_storage')
    const tag = await mountTag()

    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('touchstart'))
    await flushPromises()
    expect(tag.fired).toBe(false)

    loadIdle.resolve()
    await flushPromises()
    expect(tag.fired).toBe(true)
  })

  it('holds the tag while the address holds a secret, whatever the consent', async () => {
    const address = window.location.pathname
    window.history.replaceState(null, '', '/account/password/reset/key/a-key')
    try {
      decide(true, 'analytics_storage', 'ad_storage')

      const tag = await mountTag()
      loadIdle.resolve()
      await flushPromises()

      expect(tag.fired).toBe(false)
    }
    finally {
      window.history.replaceState(null, '', address)
    }
  })

  it('holds the tag while the query holds a secret', async () => {
    const address = window.location.pathname
    window.history.replaceState(null, '', '/account/login?next=%2Fcart%2Frecover%2Fabc')
    try {
      decide(true, 'analytics_storage')

      const tag = await mountTag()
      loadIdle.resolve()
      await flushPromises()

      expect(tag.fired).toBe(false)
    }
    finally {
      window.history.replaceState(null, '', address)
    }
  })

  it('queues the decision the visitor arrived with at once', async () => {
    const { cookiesEnabledIds, isConsentGiven } = useCookieControl()
    isConsentGiven.value = true
    cookiesEnabledIds.value = ['analytics_storage']
    consentUpdate.mockClear()
    setTenant({ gaTrackingId: 'G-GGKMZ8YLNN', googleAdsConversionId: '' })

    await mountSuspended(GaHarness, { route: false })

    expect(consentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      analytics_storage: 'granted',
      ad_storage: 'denied',
    }))
  })

  /**
   * gtag's consent update runs its listeners and the hits it held back
   * synchronously: ~260 ms of the cookie banner's Accept on a 6x-slowed
   * CPU (webside product page, 2026-11-01).
   */
  it('updates the tag after the frame a decision on the page is painted in', async () => {
    const { cookiesEnabledIds, isConsentGiven } = useCookieControl()
    isConsentGiven.value = undefined
    cookiesEnabledIds.value = []
    nextPaint.promise = new Promise((resolve) => {
      nextPaint.resolve = resolve
    })
    setTenant({ gaTrackingId: 'G-GGKMZ8YLNN', googleAdsConversionId: '' })
    await mountSuspended(GaHarness, { route: false })
    consentUpdate.mockClear()

    isConsentGiven.value = true
    cookiesEnabledIds.value = ['ad_storage', 'analytics_storage']
    await flushPromises()
    expect(consentUpdate).not.toHaveBeenCalled()

    nextPaint.resolve()
    await flushPromises()
    expect(consentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      ad_storage: 'granted',
      analytics_storage: 'granted',
      personalization_storage: 'denied',
    }))
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

  // X reads og: where twitter: is absent. A site-wide twitter:title,
  // description or image outlived every page that set only og:, and the
  // category and products pages showed the store's name and logo.
  it('states the card type only, so X reads each page\'s og: tags', async () => {
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
    const twitter = [...document.querySelectorAll('meta[name^="twitter:"]')].map(meta => meta.getAttribute('name'))
    for (const key of head.entries.keys()) {
      if (!before.has(key)) head.entries.delete(key)
    }

    expect(twitter).toEqual(['twitter:card'])
  })

  it('verifies the store with Bing only when it has a token', async () => {
    const verification = async () => {
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
      const content = document.querySelector('meta[name="msvalidate.01"]')?.getAttribute('content')
      for (const key of head.entries.keys()) {
        if (!before.has(key)) head.entries.delete(key)
      }
      return content
    }

    setTenant({ bingSiteVerification: 'token' })
    expect(await verification()).toBe('token')
    setTenant({ bingSiteVerification: '' })
    expect(await verification()).toBeUndefined()
  })

  it('preconnects to the store\'s media origin only, without CORS mode', async () => {
    setTenant({ assetsDomain: 'assets.shop.test', staticDomain: 'static.shop.test' })

    expect(await connectionHints()).toEqual([
      { rel: 'preconnect', href: 'https://assets.shop.test', crossorigin: null },
    ])
  })

  /**
   * RSS autodiscovery: each feed a reader can subscribe to, each with its
   * own title (RSS Board). The store feed adds products, so it is offered
   * only with the catalogue; both need the blog.
   */
  describe('feed links', () => {
    async function feedLinks() {
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
      const links = [...document.querySelectorAll('link[type="application/rss+xml"]')]
        .map(link => ({
          rel: link.getAttribute('rel'),
          title: link.getAttribute('title'),
          href: link.getAttribute('href'),
        }))
      for (const key of head.entries.keys()) {
        if (!before.has(key)) head.entries.delete(key)
      }
      return links
    }

    const features = (on: { blog: boolean, catalogue: boolean }) =>
      ({ features: { ...useTenantStore().config!.features, ...on } })

    it('offers the store feed and the blog feed with the catalogue', async () => {
      setTenant(features({ blog: true, catalogue: true }))
      const { $i18n } = useNuxtApp()
      const { name, url } = useSiteConfig()
      expect($i18n.te('feeds.store') && $i18n.te('feeds.blog')).toBe(true)

      expect(await feedLinks()).toEqual([
        { rel: 'alternate', title: $i18n.t('feeds.store', { name }), href: `${url}/rss.xml` },
        { rel: 'alternate', title: $i18n.t('feeds.blog', { name }), href: `${url}/blog/rss.xml` },
      ])
    })

    it('offers only the blog feed without the catalogue', async () => {
      setTenant(features({ blog: true, catalogue: false }))

      expect((await feedLinks()).map(link => link.href)).toEqual([`${useSiteConfig().url}/blog/rss.xml`])
    })

    it('offers no feed without the blog', async () => {
      setTenant(features({ blog: false, catalogue: true }))

      expect(await feedLinks()).toEqual([])
    })

    it('offers the feeds in the page\'s language', async () => {
      setTenant(features({ blog: true, catalogue: true }))
      const { $i18n } = useNuxtApp()
      const { url } = useSiteConfig()
      const before = $i18n.locale.value
      $i18n.locale.value = 'en'
      try {
        expect((await feedLinks()).map(link => link.href)).toEqual([
          `${url}/en/rss.xml`,
          `${url}/en/blog/rss.xml`,
        ])
      }
      finally {
        $i18n.locale.value = before
      }
    })
  })
})

/**
 * Meta's automatic setup listens to every click on the page and reads the
 * tapped element: 120-196 ms of each tap on a 6x-slowed phone profile
 * (webside product page, 2026-11-01). The store's own events do not need
 * it.
 */
describe('setupMetaPixelConsent', () => {
  const MetaHarness = defineComponent({
    setup() {
      setupMetaPixelConsent()
      return () => h('div')
    },
  })

  beforeEach(() => {
    metaFbq.mockClear()
  })

  it('opts the store pixel out of the automatic setup', async () => {
    setTenant({ metaPixelId: '2069195953640891' })
    await mountSuspended(MetaHarness, { route: false })

    expect(metaFbq).toHaveBeenCalledWith('set', 'autoConfig', false, '2069195953640891')
  })

  it('registers nothing for a store with no pixel', async () => {
    setTenant({ metaPixelId: '' })
    await mountSuspended(MetaHarness, { route: false })

    expect(metaFbq).not.toHaveBeenCalled()
  })
})
