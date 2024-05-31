<script lang="ts" setup>
import { AuthProcess } from '~/types/all-auth'

setupPageHeader()
setupCursorStates()

const { loggedIn } = useUserSession()
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
  title: config.public.appTitle,
  description: config.public.appDescription,
  alt: config.public.appTitle,
  url: config.public.appLogo,
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
    <NuxtLayout>
      <PlusModalNuxtPage />
    </NuxtLayout>
    <Pwa />
    <CookieControl />
    <UNotifications />
    <DebugTools />
  </div>
</template>
