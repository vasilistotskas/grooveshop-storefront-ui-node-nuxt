<script lang="ts" setup>
// Import ONLY the locales in SUPPORTED_LOCALES (i18n/locales.ts) — the
// former namespace import (`import * as uiLocales`) bundled all 62 of
// @nuxt/ui's locale files into the entry chunk of every page: 129KB of
// the entry's 324KB minified (40%), measured in the 2026-08-29
// entry-chunk sourcemap audit. Activating a new locale means adding its
// import here.
import { el } from '@nuxt/ui/locale'

const uiLocales = { el } as const

setupPageHeader()
setupGoogleAnalyticsConsent()
setupMetaPixelConsent()
setupTikTokPixelConsent()
setupCookieConsentTracking()
setupCursorState()
setupSocialLogin()

const { enabled } = useAuthPreviewMode()
const { loggedIn, user } = useUserSession()
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const { locales, locale } = useI18n()
const tenantStore = useTenantStore()
const { ogImageUrl } = useTenantBranding()

// Tenant-aware SEO metadata. siteConfig is already overridden per
// tenant by server/plugins/tenant-site-config.ts; tenantStore exposes
// branding fields (logo, store name) that the env-level appLogo /
// appTitle don't cover.
const siteName = computed(
  () => tenantStore.storeName || config.public.appTitle,
)
const siteLogo = computed(
  () => ogImageUrl.value,
)
const siteUrl = computed(() => siteConfig.url || config.public.baseUrl)

watch([loggedIn, user], ([l, u]) => {
  if (import.meta.dev || process.env.NODE_ENV === 'development') return
  enabled.value = !!(l && u?.isSuperuser)
}, { immediate: true })

// Tenant-only — no platform/env fallback (each tenant links its own
// social accounts; a shared link would misattribute traffic).
function orgSocialUrl(key: string): string | undefined {
  return (tenantStore.socials as Record<string, string>)[key] || undefined
}

// Physical-store data (hours / geo / registered address) upgrades the
// Organization node to LocalBusiness. Property-level reactivity only:
// useSchemaOrg freezes the node ARRAY at setup on SSR, so the switch
// lives in the '@type' field, which unhead resolves at render — after
// the setting fetches settle.
const { hasData: hasBusinessHours, schedule: businessSchedule }
  = useBusinessHours()
const { identity, hasIdentity } = useMerchantIdentity()
const geoLat = useSettingValue('STORE_GEO_LAT')
const geoLng = useSettingValue('STORE_GEO_LNG')

const SCHEMA_DAY_NAMES: Record<WeekDayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const openingHoursSpecification = computed(() => {
  const schedule = businessSchedule.value
  if (!schedule) return undefined
  // Days sharing identical opens/closes collapse into one entry.
  const groups = new Map<
    string,
    { days: string[], opens: string, closes: string }
  >()
  for (const day of WEEK_DAY_KEYS) {
    const entry = schedule[day]
    if (!entry) continue
    const groupKey = `${entry.opens}-${entry.closes}`
    const group = groups.get(groupKey)
      ?? { days: [], opens: entry.opens, closes: entry.closes }
    group.days.push(SCHEMA_DAY_NAMES[day])
    groups.set(groupKey, group)
  }
  if (groups.size === 0) return undefined
  return [...groups.values()].map(group => ({
    '@type': 'OpeningHoursSpecification',
    'dayOfWeek': group.days,
    'opens': group.opens,
    'closes': group.closes,
  }))
})

const geo = computed(() => {
  const latitude = Number.parseFloat(geoLat.value)
  const longitude = Number.parseFloat(geoLng.value)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined
  }
  return { '@type': 'GeoCoordinates', latitude, longitude }
})

const postalAddress = computed(() => {
  const d = identity.value
  if (!hasIdentity.value || !d) return undefined
  const streetAddress = [d.addressLine1, d.addressLine2]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(', ')
  if (!streetAddress && !d.city?.trim()) return undefined
  return {
    '@type': 'PostalAddress',
    ...(streetAddress ? { streetAddress } : {}),
    ...(d.city?.trim() ? { addressLocality: d.city.trim() } : {}),
    ...(d.postalCode?.trim() ? { postalCode: d.postalCode.trim() } : {}),
    ...(d.country?.trim() ? { addressCountry: d.country.trim() } : {}),
  }
})

const organizationType = computed(() =>
  hasBusinessHours.value || geo.value || postalAddress.value
    ? 'LocalBusiness'
    : 'Organization',
)

// The physical-store extras attach AFTER defineOrganization: their
// values are refs of objects, which unhead's deep resolve unwraps at
// render but the definer's input type only admits at leaf positions.
// define* helpers just spread input + _resolver, so this is identical
// to passing them in.
const organizationNode = {
  ...defineOrganization({
    name: siteName,
    logo: siteLogo,
    sameAs: [
      orgSocialUrl('facebook'),
      orgSocialUrl('twitter'),
      orgSocialUrl('instagram'),
    ].filter(Boolean) as string[],
  }),
  '@type': organizationType,
  'address': postalAddress,
  'geo': geo,
  'openingHoursSpecification': openingHoursSpecification,
}

useSchemaOrg([
  defineWebPage(),
  defineWebSite({
    url: siteUrl,
    name: siteName,
    description: siteConfig.description,
    inLanguage: locales.value.map(l => l.language),
  }),
  organizationNode,
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
