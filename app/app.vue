<script lang="ts" setup>
setupPageHeader()
setupGoogleAnalyticsConsent()
setupCursorStates()
setupSocialLogin()
setupWebSocket()

const config = useRuntimeConfig()
const { locales } = useI18n()

const cartStore = useCartStore()
const { fetchCart } = cartStore

await fetchCart()

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
const ogImageOptions = reactive({
  alt: config.public.appTitle,
  url: config.public.appLogo,
  width: 1200,
  height: 630,
})

useSchemaOrg(schemaOrgOptions)
defineOgImage(ogImageOptions)
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
