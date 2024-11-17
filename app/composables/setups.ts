import { withQuery } from 'ufo'
import type { UseWebNotificationOptions } from '@vueuse/core'

export function setupPageHeader() {
  const publicConfig = useRuntimeConfig().public
  const { locale, locales } = useI18n()

  const i18nHead = useLocaleHead({
    dir: true,
    lang: true,
    seo: true,
    key: 'hid',
  })

  const colorMode = useColorMode()
  const themeColor = computed(() => colorMode.value === 'dark' ? THEME_COLORS.themeDark : THEME_COLORS.themeLight)
  const colorScheme = computed(() => colorMode.value === 'dark' ? 'dark light' : 'light dark')
  const ogLocalesAlternate = computed(() => locales.value.map((l: any) => l.language))

  useSeoMeta({
    ogTitle: '%s',
    ogType: 'website',
    ogSiteName: publicConfig.appTitle,
    ogImage: publicConfig.appLogo,
    twitterTitle: publicConfig.appTitle,
    twitterDescription: publicConfig.appDescription,
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
    ogLocale: locale,
    ogLocaleAlternate: ogLocalesAlternate,
  })

  useHead(() => ({
    htmlAttrs: {
      lang: i18nHead.value.htmlAttrs!.lang,
    },
    link: [...(i18nHead.value.link || [])],
    meta: [...(i18nHead.value.meta || [])],
  }))

  useHydratedHead(() => ({
    htmlAttrs: {
      lang: i18nHead.value.htmlAttrs!.lang,
    },
    link: [...(i18nHead.value.link || [])],
    meta: [...(i18nHead.value.meta || [])],
  }))
}

export function setupCursorStates() {
  return useState<CursorStates>('cursorStates', () => generateInitialCursorStates())
}

export function setupWebSocket() {
  const websocketInstance = ref<any>(null)
  const config = useRuntimeConfig()
  const { locale } = useI18n()
  const toast = useToast()
  const { user, session, loggedIn } = useUserSession()
  const userNotificationStore = useUserNotificationStore()
  const { refreshNotifications } = userNotificationStore

  function initializeWebSocket() {
    if (import.meta.client) {
      const websocketProtocol = import.meta.client && window.location.protocol === 'https:' ? 'wss' : 'ws'
      const djangoApiHostName = config.public.djangoHostName || `api.${window.location.hostname}`
      const wsEndpoint = withQuery(`${websocketProtocol}://${djangoApiHostName}/ws/notifications`, {
        user_id: user.value?.id,
        session_token: session.value.sessionToken,
        access_token: session.value.accessToken,
      })

      const options: UseWebNotificationOptions = {
        dir: 'auto',
        lang: locale.value,
        icon: '/logo.svg',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
      }

      const {
        isSupported: isBroadcastChannelSupported,
        post,
      } = useBroadcastChannel({ name: 'notifications' })

      const {
        isSupported: isWebNotificationSupported,
        show,
      } = useWebNotification(options)

      websocketInstance.value = useWebSocket(
        wsEndpoint,
        {
          autoReconnect: true,
          onConnected: (ws) => {
            console.info('WebSocket connected', ws)
          },
          onDisconnected: (_ws, event) => {
            console.info('WebSocket disconnected', event)
          },
          onError: (_ws, event) => {
            console.info('WebSocket error', event)
          },
          onMessage: async (_ws, event) => {
            console.info('WebSocket message', event)
            const data = JSON.parse(event.data)
            console.info('WebSocket data.translations[locale.value]', data.translations[locale.value])
            await refreshNotifications()
            toast.add({
              title: data.translations[locale.value].title,
              description: data.translations[locale.value].message,
              color: 'green',
            })
            if (isBroadcastChannelSupported) {
              post(data)
            }
            if (isWebNotificationSupported) {
              await show({
                title: data.translations[locale.value].title,
                body: data.translations[locale.value].message,
                tag: data.type,
              })
            }
          },
        },
      )
    }
  }

  function closeWebSocket() {
    if (websocketInstance.value) {
      websocketInstance.value.close()
      websocketInstance.value = null
      console.info('WebSocket closed')
    }
  }

  watch(
    () => loggedIn.value,
    (isLoggedIn, previous) => {
      if (!previous && isLoggedIn) {
        initializeWebSocket()
      }
      else if (previous && !isLoggedIn) {
        closeWebSocket()
      }
    },
    { immediate: true },
  )

  return {
    websocketInstance,
    initializeWebSocket,
    closeWebSocket,
  }
}

export function setupGoogleAnalyticsConsent() {
  const config = useRuntimeConfig()
  const { load, status, proxy } = useScriptGoogleAnalytics({
    id: config.public.scripts.googleAnalytics.id,
    scriptOptions: {
      trigger: 'manual',
      bundle: true,
    },
  })

  const {
    cookiesEnabledIds,
    isConsentGiven,
  } = useCookieControl()

  watch(
    () => status.value,
    (current, _previous) => {
      if (current === 'loaded') {
        // @ts-ignore
        proxy.gtag('consent', 'default', {
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          ad_storage: 'denied',
          analytics_storage: 'denied',
          functionality_storage: 'denied',
          personalization_storage: 'denied',
          security_storage: 'denied',
        })
      }
    },
    { immediate: true },
  )

  watch(
    () => cookiesEnabledIds.value,
    async (current, _previous) => {
      if (isConsentGiven.value) {
        if (status.value !== 'loaded') {
          await load()
        }
        const consentFieldStatus = (field: string) => current?.includes(field) ? 'granted' : 'denied'
        // @ts-ignore
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
  const config = useRuntimeConfig()
  const gsiEnabled = config.public.googleGsiEnable === 'true'
  if (!gsiEnabled) return
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
      function handleCredentialResponse(response: { credential: string }) {
        providerToken({
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
