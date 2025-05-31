<script lang="ts" setup>
import * as uiLocales from '@nuxt/ui/locale'

setupPageHeader()
setupGoogleAnalyticsConsent()
setupCursorState()
setupSocialLogin()

const { enabled } = useAuthPreviewMode()
const { loggedIn, user } = useUserSession()
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const { locales, locale } = useI18n()

watch([loggedIn, user], ([l, u]) => {
  if (import.meta.dev || process.env.NODE_ENV === 'development') return
  enabled.value = !!(l && u?.isSuperuser)
}, { immediate: true })

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
  <NuxtPwaManifest />
  <NuxtRouteAnnouncer />
  <LoadingIndicator />
  <UApp :locale="uiLocales[locale]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Pwa />
    <CookieControl />
  </UApp>
</template>
