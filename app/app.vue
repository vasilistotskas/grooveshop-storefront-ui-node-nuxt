<script lang="ts" setup>
import { AuthProcess } from '~/types/all-auth'

setupPageHeader()
setupCursorStates()

const { loggedIn } = useUserSession()
const { gtag } = useScriptGoogleAnalytics()
const authStore = useAuthStore()
const { setupConfig, setupSession } = authStore
const { config: authConfig } = storeToRefs(authStore)

await setupConfig()
await setupSession()

const config = useRuntimeConfig()
const { locales } = useI18n()

const cartStore = useCartStore()
const { fetchCart } = cartStore

await fetchCart()

const {
  providerToken,
} = useAllAuthAuthentication()

const {
  isConsentGiven,
} = useCookieControl()

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

      window.google.accounts.id.initialize({
        client_id: provider.client_id ? provider.client_id : '',
        callback: handleCredentialResponse,
      })
      window.google.accounts.id.prompt()
    }
  }
})

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
    <UNotifications />
    <DebugTools />
  </div>
</template>
