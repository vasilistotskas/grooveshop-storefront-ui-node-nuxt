<script lang="ts" setup>
const config = useRuntimeConfig()
const { locales } = useI18n()

const authStore = useAuthStore()
const { setupConfig, setupSession } = authStore
const cartStore = useCartStore()
const { fetchCart } = cartStore
const userStore = useUserStore()
const { setupSessions } = userStore
const userNotificationStore = useUserNotificationStore()
const { setupNotifications } = userNotificationStore

await setupConfig()
await setupSession()
await setupSessions()
await setupNotifications()
await fetchCart()

setupPageHeader()
setupCursorStates()
setupGoogleAnalyticsConsent()
setupSocialLogin()
setupWebSocket()

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
    inLanguage: locales.value.map((l: any) => l.language),
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
