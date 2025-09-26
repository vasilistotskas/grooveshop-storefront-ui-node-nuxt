import * as uiLocales from '@nuxt/ui/locale'

export function setupPageHeader() {
  const publicConfig = useRuntimeConfig().public
  const siteConfig = useSiteConfig()
  const { $i18n } = useNuxtApp()

  const i18nHead = useLocaleHead({
    dir: true,
    lang: true,
    seo: true,
  })

  const colorMode = useColorMode()
  const themeColor = computed(() => colorMode.value === 'dark' ? THEME_COLORS.themeDark : THEME_COLORS.themeLight)
  const colorScheme = computed(() => colorMode.value === 'dark' ? 'dark light' : 'light dark')
  const ogLocalesAlternate = computed(() => $i18n.locales.value.map((l: any) => l.language))
  const lang = computed(() => uiLocales[$i18n.locale.value].code)
  const dir = computed(() => uiLocales[$i18n.locale.value].dir)

  useSeoMeta({
    title: publicConfig.appTitle,
    ogUrl: publicConfig.baseUrl,
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
    ogLocaleAlternate: ogLocalesAlternate,
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
  const { proxy } = useScriptGoogleAnalytics({
    id: config.public.scripts.googleAnalytics.id,
    onBeforeGtagStart(gtag) {
      gtag('consent', 'default', {
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        ad_storage: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'granted',
        personalization_storage: 'denied',
        security_storage: 'denied',
        wait_for_update: 500,
      })
    },
  })

  const {
    cookiesEnabledIds,
    isConsentGiven,
  } = useCookieControl()

  watch(
    () => cookiesEnabledIds.value,
    async (current, _previous) => {
      if (isConsentGiven.value) {
        const consentFieldStatus = (field: string) => current?.includes(field) ? 'granted' : 'denied'
        proxy.gtag('consent', 'update', {
          ad_storage: consentFieldStatus('ad_storage'),
          ad_user_data: consentFieldStatus('ad_user_data'),
          ad_personalization: consentFieldStatus('ad_personalization'),
          analytics_storage: consentFieldStatus('analytics_storage'),
          functionality_storage: consentFieldStatus('functionality_storage'),
          personalization_storage: consentFieldStatus('personalization_storage'),
          security_storage: consentFieldStatus('security_storage'),
        })
      }
    },
    { deep: true, immediate: true },
  )
}

export function setupSocialLogin() {
  const { enabled } = useAuthPreviewMode()
  const config = useRuntimeConfig()
  if (!config.public.googleGsiEnable || enabled.value) return
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
          process: AuthProcess.LOGIN,
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
