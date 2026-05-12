<script lang="ts" setup>
import * as uiLocales from '@nuxt/ui/locale'

setupPageHeader()
setupGoogleAnalyticsConsent()
setupMetaPixelConsent()
setupCursorState()
setupSocialLogin()

const { enabled } = useAuthPreviewMode()
const { loggedIn, user } = useUserSession()
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const { locales, locale } = useI18n()
const tenantStore = useTenantStore()

// Tenant-aware SEO metadata. siteConfig is already overridden per
// tenant by server/plugins/tenant-site-config.ts; tenantStore exposes
// branding fields (logo, store name) that the env-level appLogo /
// appTitle don't cover.
const siteName = computed(
  () => tenantStore.storeName || config.public.appTitle,
)
const siteLogo = computed(
  () => tenantStore.logoLightUrl || config.public.appLogo,
)
const siteUrl = computed(() => siteConfig.url || config.public.baseUrl)

watch([loggedIn, user], ([l, u]) => {
  if (import.meta.dev || process.env.NODE_ENV === 'development') return
  enabled.value = !!(l && u?.isSuperuser)
}, { immediate: true })

// Prefer per-tenant social URLs; fall back to platform-wide env vars.
const platformSocials = config.public.socials as Record<string, string | undefined>
function orgSocialUrl(key: string): string | undefined {
  return (tenantStore.socials as Record<string, string>)[key] || platformSocials[key] || undefined
}

useSchemaOrg([
  defineWebPage(),
  defineWebSite({
    url: siteUrl,
    name: siteName,
    description: siteConfig.description,
    inLanguage: locales.value.map(l => l.language),
  }),
  defineOrganization({
    name: siteName,
    logo: siteLogo,
    sameAs: [
      orgSocialUrl('facebook'),
      orgSocialUrl('twitter'),
      orgSocialUrl('instagram'),
    ].filter(Boolean) as string[],
  }),
])
useSeoMeta({
  ogImage: siteLogo,
  ogImageAlt: siteName,
  ogImageWidth: 1200,
  ogImageHeight: 630,
})

// Per-tenant theme-color: matches manifest.webmanifest.get.ts which
// already derives from tenant.accentHex. Falling back to the platform
// neutral hex keeps the Webside look identical when no tenant accent is
// configured (H13 in MULTI_TENANT_AUDIT.md).
const themeColor = computed(() => tenantStore.accentHex || '#1a202c')
useHead({
  meta: [
    { name: 'theme-color', content: themeColor },
  ],
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <LoadingIndicator />
  <UApp
    :locale="uiLocales[locale]"
    :toaster="{
      position: 'top-right',
      duration: 5000,
    }"
  >
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <CookieControl />
  </UApp>
</template>
