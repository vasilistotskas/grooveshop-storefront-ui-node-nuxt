import { el as uiLocaleEl } from '@nuxt/ui/locale'

export function setupPageHeader() {
  const route = useRoute()
  const publicConfig = useRuntimeConfig().public
  const siteConfig = useSiteConfig()
  const { $i18n } = useNuxtApp()

  const siteUrl = siteConfig.url

  const i18nHead = useLocaleHead({
    dir: true,
    lang: true,
    seo: true,
  })

  const colorMode = useColorMode()
  const themeColor = computed(() => colorMode.value === 'dark' ? THEME_COLORS.themeDark : THEME_COLORS.themeLight)
  const colorScheme = computed(() => colorMode.value === 'dark' ? 'dark light' : 'light dark')
  const ogLocalesAlternate = computed(() => $i18n.locales.value.map(l => l.language || l.code))
  // Prefer the locale's full BCP-47 `language` (e.g. `el-GR`) so screen
  // readers + search engines get region-specific pronunciation hints.
  // Fall back to @nuxt/ui's 2-letter code when no `language` is configured
  // (e.g. legacy locales added without the `language` field).
  const lang = computed(() => {
    const props = $i18n.localeProperties.value as { language?: string, code: string }
    return props.language || uiLocaleEl.code
  })
  const dir = computed(() => uiLocaleEl.dir)

  useSeoMeta({
    title: publicConfig.appTitle,
    ogUrl: () => `${siteUrl}${route.path}`,
    ogTitle: '%s',
    ogType: 'website',
    ogSiteName: siteConfig.name,
    ogImage: publicConfig.appLogo,
    twitterTitle: publicConfig.appTitle,
    twitterDescription: siteConfig.description,
    twitterImage: publicConfig.appLogo,
    twitterCard: 'summary',
    applicationName: publicConfig.appTitle,
    author: publicConfig.author.name,
    creator: publicConfig.author.name,
    publisher: publicConfig.author.name,
    mobileWebAppCapable: 'yes',
    appleMobileWebAppCapable: 'yes',
    msapplicationConfig: '/favicon/browserconfig.xml',
    msapplicationTileImage: '/favicon/ms-icon-150x150.png',
    googleSiteVerification: publicConfig.googleSiteVerification,
    themeColor: themeColor,
    colorScheme: colorScheme,
    msapplicationTileColor: themeColor,
    ogLocale: $i18n.locale,
    ogLocaleAlternate: ogLocalesAlternate.value,
  })

  useHead(() => ({
    title: publicConfig.appTitle,
    templateParams: {
      siteName: siteConfig.name,
      separator: publicConfig.titleSeparator,
    },
    htmlAttrs: {
      lang,
      dir,
    },
    link: [...(i18nHead.value.link || [])],
    meta: [...(i18nHead.value.meta || []),
      {
        name: 'p:domain_verify',
        content: publicConfig.domainVerifyId,
      },
    ],
  }))
}

export function setupCursorState() {
  return useState<CursorState>('cursor-state', () => generateInitialCursorState())
}

export function setupGoogleAnalyticsConsent() {
  const config = useRuntimeConfig()
  const id = config.public.scripts.googleAnalytics.id
  // Skip the script entirely when the id is missing or still the
  // placeholder. Otherwise @nuxt/scripts preloads ``gtag.js`` for
  // every visitor and the resource sits unused (browser warns
  // "preloaded but not used"). Real GA4 ids are ``G-`` followed by
  // 10+ alphanumerics — ``G-XXXXXXXXXX`` is the example value.
  if (!id || !/^G-[A-Z0-9]{8,}$/.test(id) || id === 'G-XXXXXXXXXX') {
    return
  }
  const { consent } = useScriptGoogleAnalytics({
    id,
    // Defer loading until after hydration to not block initial render
    scriptOptions: {
      trigger: 'onNuxtReady',
    },
    defaultConsent: {
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      ad_storage: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'denied',
      security_storage: 'denied',
      wait_for_update: 500,
    },
  })

  const {
    cookiesEnabledIds,
    isConsentGiven,
  } = useCookieControl()

  watch(
    () => cookiesEnabledIds.value,
    (current) => {
      if (!consent || !isConsentGiven.value) return
      const status = (field: string) => current?.includes(field) ? 'granted' as const : 'denied' as const
      consent.update({
        ad_storage: status('ad_storage'),
        ad_user_data: status('ad_user_data'),
        ad_personalization: status('ad_personalization'),
        analytics_storage: status('analytics_storage'),
        functionality_storage: status('functionality_storage'),
        personalization_storage: status('personalization_storage'),
        security_storage: status('security_storage'),
      })
    },
    { immediate: true },
  )
}

/**
 * Reactive "the customer granted ad consent" gate shared by the ad
 * pixels (Meta, TikTok): the user has explicitly accepted the banner
 * AND the ``ad_storage`` category is enabled. Either gate alone is
 * insufficient:
 *
 * * isConsentGiven only flips true after the user clicks the banner
 *   so we don't fire pixel events for visitors who never made a
 *   choice.
 * * Even when the banner is acknowledged, the user can deselect
 *   ad_storage via "Manage preferences" — we honour that choice.
 */
function useAdStorageConsent() {
  const { cookiesEnabledIds, isConsentGiven } = useCookieControl()
  return computed(() =>
    !!(
      isConsentGiven.value
      && cookiesEnabledIds.value?.includes('ad_storage')
    ),
  )
}

/**
 * Initialise the Meta Pixel — single source of truth for the
 * registration. Called from ``app.vue`` setup once per app instance.
 *
 * Loading lifecycle:
 *
 * * Reactive ``adConsent`` is the boolean "user has given ad_storage
 *   consent in the cookie banner" — recomputed when the banner state
 *   changes.
 * * ``useScriptTriggerConsent({ consent: adConsent })`` is the
 *   documented binary script-load gate. The script tag is injected
 *   into the DOM only after ``adConsent`` flips true; if it later
 *   flips false, ``useScriptTriggerConsent`` revokes and the script
 *   is unloaded. This is the gate documented in
 *   ``https://nuxt.com/scripts/guides/consent`` — replacing the
 *   previous pattern that combined ``defaultConsent: 'denied'`` with
 *   a manual ``consent.grant()`` watcher. That older combination
 *   left the @nuxt/scripts registry stuck in a "loaded-but-empty"
 *   state (registered with no DOM tag, fbq queue never drained)
 *   because ``defaultConsent`` is purely a vendor-side flag and
 *   never gates script injection — the script would still attempt
 *   to load on ``onNuxtReady`` but the SSR/client dedup of
 *   ``useScriptMetaPixel`` options dropped ``defaultConsent`` between
 *   the two call sites, creating subtle races. Single registration
 *   here + single proxy lookup in ``useMetaPixel`` removes both.
 *
 * No-op when ``META_PIXEL_ID`` is not provisioned — the cookie banner
 * stays untouched and ``useMetaPixel`` consumers receive a no-op
 * proxy.
 */
export function setupMetaPixelConsent() {
  const config = useRuntimeConfig()
  const pixelId = (config.public as { metaPixelId?: string })?.metaPixelId
  if (!pixelId) return

  // SSR guard: ``@nuxt/scripts >= 1.2`` removed the SSR-safe posture of
  // the meta-pixel registry — calling ``useScriptMetaPixel`` (even
  // without proxy access) eagerly invokes its ``use()`` callback which
  // dereferences ``window.fbq`` and throws during prerender. The pixel
  // only needs to load in the browser anyway, so skip the entire
  // registration on the server. The cookie-consent reactivity below is
  // also client-only by design (the banner state lives in client
  // storage).
  if (import.meta.server) return

  const trigger = useScriptTriggerConsent({ consent: useAdStorageConsent() })

  useScriptMetaPixel({
    id: pixelId,
    scriptOptions: { trigger },
  })
}

/**
 * Initialise the TikTok Pixel — single source of truth for the
 * registration, mirroring ``setupMetaPixelConsent`` above: same
 * consent-trigger lifecycle (the script tag is injected only after
 * the customer grants ``ad_storage``) and same client-only posture
 * (the registry's ``use()`` dereferences ``window.ttq`` and would
 * throw during prerender / SSR). Called from ``app.vue`` setup once
 * per app instance.
 *
 * No-op when ``NUXT_PUBLIC_TIKTOK_PIXEL_ID`` is not provisioned — the
 * cookie banner stays untouched and ``useTikTokPixel`` consumers
 * receive a no-op proxy.
 */
export function setupTikTokPixelConsent() {
  const config = useRuntimeConfig()
  const pixelId = (config.public as { tiktokPixelId?: string })?.tiktokPixelId
  if (!pixelId) return
  if (import.meta.server) return

  const trigger = useScriptTriggerConsent({ consent: useAdStorageConsent() })

  useScriptTikTokPixel({
    id: pixelId,
    scriptOptions: { trigger },
  })
}

/**
 * Telemetry hook for the cookie banner — emits two server-side wide
 * events so the team can measure banner acceptance.
 *
 * * ``banner_shown`` — fires once per browser session whenever the
 *   banner is on screen (``isConsentGiven !== true``). Covers both
 *   first-time visitors (``undefined``) and returning visitors who
 *   previously declined (``false``). Per-session dedup via
 *   ``sessionStorage`` so a single visit with N pageviews counts as
 *   one impression, not N. Forms the denominator of the accept-rate
 *   metric.
 * * ``consent_decision`` — fires the first time the user resolves the
 *   banner in this page (transition to ``true``). Carries the derived
 *   decision (``accept_all`` / ``accept_partial`` / ``decline_all``)
 *   computed from how many optional categories ended up enabled.
 *
 * Subsequent preference changes via the floating control button (the
 * ``true → true`` modal-save path) are intentionally not re-emitted —
 * the metric we care about is the banner resolution, not running
 * churn.
 */
const COOKIE_BANNER_SEEN_KEY = 'cookie_banner_seen'

export function setupCookieConsentTracking() {
  if (import.meta.server) return

  const { isConsentGiven, cookiesEnabledIds, moduleOptions } = useCookieControl()

  const post = (body: CookieConsentEventBody) =>
    $fetch('/api/analytics/cookie-consent', {
      method: 'POST',
      body,
      // ``keepalive`` lets the browser flush the request even if the
      // user navigates away immediately after clicking accept/decline.
      keepalive: true,
    }).catch(() => {})

  const deriveDecision = (): Extract<CookieConsentEventBody, { decision: unknown }>['decision'] => {
    const optionalIds = moduleOptions.cookies.optional.map(c => c.id)
    const enabled = cookiesEnabledIds.value ?? []
    const optionalEnabled = enabled.filter(id => optionalIds.includes(id))
    if (optionalEnabled.length === 0) return 'decline_all'
    if (optionalEnabled.length === optionalIds.length) return 'accept_all'
    return 'accept_partial'
  }

  onMounted(() => {
    if (isConsentGiven.value === true) return
    try {
      if (window.sessionStorage.getItem(COOKIE_BANNER_SEEN_KEY)) return
      window.sessionStorage.setItem(COOKIE_BANNER_SEEN_KEY, '1')
    }
    catch {
      // Private-mode browsers may throw on sessionStorage access —
      // proceed without dedup rather than miss the impression.
    }
    void post({ event: 'banner_shown' })
  })

  watch(isConsentGiven, (current, previous) => {
    // Emit on the resolution transition — anything → true — and skip
    // the modal "save preferences" path where the user was already
    // consented before opening the modal.
    if (current !== true) return
    if (previous === true) return
    void post({
      event: 'consent_decision',
      decision: deriveDecision(),
      enabledIds: cookiesEnabledIds.value ?? [],
    })
  })
}

export function setupSocialLogin() {
  const { enabled } = useAuthPreviewMode()
  const config = useRuntimeConfig()
  if (!config.public.googleGsiEnable || enabled.value) return

  // SSR guard: ``useScript`` (from @nuxt/scripts >= 1.2) eagerly
  // invokes the ``use()`` callback below at registration, which
  // dereferences ``window.google`` and throws during prerender / SSR.
  // GSI is client-only anyway — the GSI button + ``onLoaded`` callback
  // are meaningless on the server — so skip the entire setup.
  if (import.meta.server) return

  const { loggedIn } = useUserSession()
  const { config: authConfig } = storeToRefs(useAuthStore())
  const {
    providerToken,
  } = useAllAuthAuthentication()

  const gsi = useScript({
    src: '//accounts.google.com/gsi/client',
    async: true,
    defer: true,
    referrerpolicy: false,
    crossorigin: false,
  }, {
    use() {
      // @ts-ignore
      return window.google?.accounts?.id
    },
  })

  gsi.onLoaded(() => {
    const provider = authConfig.value?.socialaccount?.providers.find(p => p.id === 'google')
    if (!loggedIn.value && provider && gsi.instance) {
      async function handleCredentialResponse(response: { credential: string }) {
        await providerToken({
          provider: provider ? provider.id : '',
          token: {
            id_token: response.credential,
            client_id: provider?.client_id ? provider.client_id : '',
          },
          process: GSIAuthProcess.LOGIN,
        })
      }

      if (gsi.instance) {
        gsi.proxy.initialize({
          client_id: provider.client_id || '',
          callback: handleCredentialResponse,
        })
        gsi.proxy.prompt()
      }
    }
  })
}
