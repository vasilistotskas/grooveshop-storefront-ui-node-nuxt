import type { Directions, LocaleObject } from '@nuxtjs/i18n'
import { withQuery } from 'ufo'
import type { UseWebNotificationOptions } from '@vueuse/core'
import type { CursorStates } from '~/types'
import { AuthProcess } from '~/types/all-auth'

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
    addDirAttribute: true,
    addSeoAttributes: true,
    identifierAttribute: 'hid',
    route: useRoute(),
    router: useRouter(),
    i18n: useI18n(),
  })

  const localeMap = (locales.value as LocaleObject[]).reduce((acc, l) => {
    acc[l.code!] = l.dir ?? 'ltr'
    return acc
  }, {} as Record<string, Directions>)

  useHead({
    htmlAttrs: {
      lang: () => locale.value,
      dir: () => localeMap[locale.value] ?? 'ltr',
      class: () => [],
    },
    script: [
      {
        id: 'google',
        async: true,
        defer: true,
        src: '//accounts.google.com/gsi/client',
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
        key: 'webmanifest',
        rel: 'manifest',
        href: '/manifest.webmanifest',
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

  function initializeWebSocket() {
    const websocketProtocol = import.meta.client && window.location.protocol === 'https:' ? 'wss' : 'ws'
    const djangoApiHostName = config.public.djangoHostName
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
          console.log('WebSocket connected', ws)
        },
        onDisconnected: (_ws, event) => {
          console.log('WebSocket disconnected', event)
        },
        onError: (_ws, event) => {
          console.log('WebSocket error', event)
        },
        onMessage: async (_ws, event) => {
          console.log('WebSocket message', event)
          const data = JSON.parse(event.data)
          console.log('WebSocket data.translations[locale.value]', data.translations[locale.value])
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

  function closeWebSocket() {
    if (websocketInstance.value) {
      websocketInstance.value.close()
      websocketInstance.value = null
      console.log('WebSocket closed')
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
  const { proxy } = useScriptGoogleAnalytics()
  const { isConsentGiven } = useCookieControl()

  proxy.gtag('consent', 'default', {
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    ad_storage: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'denied',
  })

  watch(
    () => isConsentGiven.value,
    (current, _previous) => {
      if (current) {
        proxy.gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
          analytics_storage: 'granted',
          functionality_storage: 'granted',
          personalization_storage: 'granted',
          security_storage: 'granted',
        })
      }
      else if (_previous && !current) {
        proxy.gtag('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
          functionality_storage: 'denied',
          personalization_storage: 'denied',
          security_storage: 'denied',
        })
      }
    },
    { immediate: true },
  )
}

export function setupSocialLogin() {
  const { loggedIn } = useUserSession()
  const { config: authConfig } = storeToRefs(useAuthStore())
  const {
    providerToken,
  } = useAllAuthAuthentication()

  onMounted(() => {
    if (import.meta.client) {
      const provider = authConfig.value?.data.socialaccount?.providers.find(p => p.id === 'google')
      if (!loggedIn.value && provider && window.google) {
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

        if ('accounts' in window.google) {
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: provider.client_id ? provider.client_id : '',
            callback: handleCredentialResponse,
          })
          // @ts-ignore
          window.google.accounts.id.prompt()
        }
      }
    }
  })
}
