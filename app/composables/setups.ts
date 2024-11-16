import { withQuery } from 'ufo'
import type { UseWebNotificationOptions } from '@vueuse/core'

function unescapeTitleTemplate(titleTemplate: string, replacements: [string, string[]][]) {
  let result = titleTemplate
  for (const [replacement, entities] of replacements) {
    for (const e of entities)
      result = result.replaceAll(e, replacement)
  }
  return result.trim()
}

export function setupPageHeader() {
  const publicConfig = useRuntimeConfig().public
  const { locale, locales } = useI18n()

  const i18nHead = useLocaleHead({
    dir: true,
    lang: true,
    seo: true,
    key: 'hid',
  })

  const localeMap = (locales.value).reduce((acc, l) => {
    acc[l.code!] = l.dir ?? 'ltr'
    return acc
  }, {})

  const colorMode = useColorMode()
  const themeColor = computed(() => colorMode.value === 'dark' ? THEME_COLORS.themeDark : THEME_COLORS.themeLight)
  const colorScheme = computed(() => colorMode.value === 'dark' ? 'dark light' : 'light dark')

  useSeoMeta({
    ogTitle: '%s',
    ogImage: publicConfig.appLogo,
    twitterTitle: publicConfig.appTitle,
    twitterDescription: publicConfig.appDescription,
    twitterImage: publicConfig.appLogo,
    twitterCard: 'summary',
  })

  useHead({
    htmlAttrs: {
      lang: () => locale.value,
      dir: () => localeMap[locale.value] ?? 'ltr',
      class: () => [],
    },
    link: [
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon/favicon-16x16.png',
      },
    ],
  })

  useHydratedHead({
    meta: [
      ...(i18nHead.value.meta || []),
      {
        name: 'description',
        content: publicConfig.appDescription,
      },
      {
        name: 'keywords',
        content: publicConfig.appKeywords,
      },
      {
        name: 'application-name',
        content: publicConfig.appTitle,
      },
      {
        name: 'author',
        content: publicConfig.author.name,
      },
      {
        name: 'creator',
        content: publicConfig.author.name,
      },
      {
        name: 'publisher',
        content: publicConfig.author.name,
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: publicConfig.appTitle,
      },
      {
        name: 'msapplication-Config',
        content: '/favicon/browserconfig.xml',
      },
      {
        name: 'msapplication-TileImage',
        content: publicConfig.appLogo,
      },
      {
        name: 'p:domain_verify',
        content: publicConfig.domainVerifyId,
      },
      {
        name: 'google-site-verification',
        content: publicConfig.googleSiteVerification,
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: publicConfig.appTitle,
      },
      {
        name: 'twitter:description',
        content: publicConfig.appDescription,
      },
      {
        name: 'twitter:image',
        content: publicConfig.appLogo,
      },
      {
        property: 'og:url',
        content: useRoute().fullPath,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site:name',
        content: publicConfig.appTitle,
      },
      {
        property: 'og:title',
        content: publicConfig.appTitle,
      },
      {
        property: 'og:description',
        content: publicConfig.appDescription,
      },
      {
        property: 'og:locale',
        content: locale.value,
      },
      {
        property: 'og:locale:alternate',
        content: locales.value.map((l: any) => l.language),
      },
      {
        property: 'fb:app:id',
        content: publicConfig.facebookAppId,
      },
      {
        id: 'theme-color',
        name: 'theme-color',
        content: themeColor.value,
      },
      {
        id: 'color-scheme',
        name: 'color-scheme',
        content: colorScheme.value,
      },
      {
        id: 'msapplication-TileColor',
        name: 'msapplication-TileColor',
        content: themeColor.value,
      },
    ],
    titleTemplate: (title?: string) => {
      let titleTemplate = title ?? ''

      if (titleTemplate.match(/&[a-z0-9#]+;/gi)) {
        titleTemplate = unescapeTitleTemplate(titleTemplate, [
          ['"', ['&#34;', '&quot;']],
          ['&', ['&#38;', '&amp;']],
          ['\'', ['&#39;', '&apos;']],
          ['\u003C', ['&#60;', '&lt;']],
          ['\u003E', ['&#62;', '&gt;']],
        ])
        if (titleTemplate.length > 60)
          titleTemplate = `${titleTemplate.slice(0, 60)}...${titleTemplate.endsWith('"') ? '"' : ''}`

        if (!titleTemplate.includes('"'))
          titleTemplate = `"${titleTemplate}"`
      }
      else if (titleTemplate.length > 60) {
        titleTemplate = `${titleTemplate.slice(0, 60)}...${titleTemplate.endsWith('"') ? '"' : ''}`
      }

      if (titleTemplate.length)
        titleTemplate += publicConfig.titleSeparator

      titleTemplate += publicConfig.appTitle

      return titleTemplate
    },
    link: [
      ...(i18nHead.value.link || []),
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon/favicon-16x16.png',
      },
    ],
  })
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
