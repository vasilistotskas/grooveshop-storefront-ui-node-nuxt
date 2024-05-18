<script lang="ts" setup>
setupPageHeader()
setupCursorStates()

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
  <div id="#app" class="app">
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
