<script lang="ts" setup>
setupPageHeader()
setupGoogleAnalyticsConsent()
setupCursorStates()
setupSocialLogin()
setupWebSocket()

const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const { locales } = useI18n()

const cartStore = useCartStore()
const { fetchCart } = cartStore

await fetchCart()

useSchemaOrg([
  defineWebPage(),
  defineWebSite({
    url: config.public.baseUrl,
    name: config.public.appTitle,
    description: siteConfig.description,
    inLanguage: locales.value.map((l: any) => l.language),
  }),
  defineOrganization({
    name: config.public.appTitle,
    logo: config.public.appLogo,
    sameAs: [
      config.public.socials.facebook,
      config.public.socials.twitter,
      config.public.socials.instagram,
    ],
  }),
])
defineOgImage({
  alt: config.public.appTitle,
  url: config.public.appLogo,
  width: 1200,
  height: 630,
})
</script>

<template>
  <div
    id="#app"
    class="app"
  >
    <NuxtPwaManifest />
    <NuxtRouteAnnouncer />
    <LoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
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
