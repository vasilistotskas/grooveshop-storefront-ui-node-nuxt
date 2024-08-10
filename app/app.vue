<script lang="ts" setup>
import type { UseWebNotificationOptions } from '@vueuse/core'
import { withQuery } from 'ufo'
import { AuthProcess } from '~/types/all-auth'

setupPageHeader()
setupCursorStates()

const { loggedIn, user, session } = useUserSession()
const { gtag } = useScriptGoogleAnalytics()
const authStore = useAuthStore()
const { setupConfig, setupSession } = authStore
const { config: authConfig } = storeToRefs(authStore)

await setupConfig()
await setupSession()

const config = useRuntimeConfig()
const { locales, locale } = useI18n()
const toast = useToast()

const cartStore = useCartStore()
const { fetchCart } = cartStore

await fetchCart()

const {
  providerToken,
} = useAllAuthAuthentication()

const {
  isConsentGiven,
} = useCookieControl()

let websocketInstance: WebSocket | null = null

function initializeWebSocket() {
  // Websocket
  const websocketProtocol = import.meta.client && window.location.protocol === 'https:' ? 'wss' : 'ws'
  const djangoApiHost = config.public.djangoHost
  const wsEndpoint = withQuery(`${websocketProtocol}://${djangoApiHost}/ws/notifications`, {
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

  websocketInstance = useWebSocket(
    wsEndpoint,
    {
      autoReconnect: true,
      onConnected: (ws) => {
        if (import.meta.dev) {
          console.log('WebSocket connected', ws)
        }
      },
      onDisconnected: (_ws, event) => {
        if (import.meta.dev) {
          console.log('WebSocket disconnected', event)
        }
      },
      onError: (_ws, event) => {
        if (import.meta.dev) {
          console.log('WebSocket error', event)
        }
      },
      onMessage: (_ws, event) => {
        if (import.meta.dev) {
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
            show({
              title: data.translations[locale.value].title,
              body: data.translations[locale.value].message,
              tag: data.type,
            })
          }
        }
      },
    },
  )
}

function closeWebSocket() {
  if (websocketInstance) {
    websocketInstance.close()
    websocketInstance = null
    if (import.meta.dev) {
      console.log('WebSocket closed')
    }
  }
}

gtag('consent', 'default', {
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
      gtag('consent', 'update', {
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
      gtag('consent', 'update', {
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

const schemaOrgOptions = [
  defineOrganization({
    name: config.public.appTitle,
    logo: config.public.appLogo,
    sameAs: [
      config.public.socials.facebook,
      config.public.socials.twitter,
      config.public.socials.instagram,
    ],
  }),
  defineWebSite({
    url: config.public.baseUrl,
    name: config.public.appTitle,
    description: config.public.appDescription,
    inLanguage: locales.value.map((l: any) => l.iso),
  }),
  defineWebPage(),
]
const ogImageOptions = {
  alt: config.public.appTitle,
  url: config.public.appLogo,
  width: 1200,
  height: 630,
}

useSchemaOrg(schemaOrgOptions)
defineOgImage(ogImageOptions)
</script>

<template>
  <div
    id="#app"
    class="app"
  >
    <NuxtPwaManifest />
    <LoadingIndicator />
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <PlusModalNuxtPage />
    </NuxtLayout>
    <Pwa />
    <CookieControl />
    <UNotifications>
      <template #title="{ title }">
        <span v-html="title" />
      </template>

      <template #description="{ description }">
        <span v-html="description" />
      </template>
    </UNotifications>
  </div>
</template>
