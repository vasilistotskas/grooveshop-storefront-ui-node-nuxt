<script lang="ts" setup>
import { withTrailingSlash } from 'ufo'
import type { SupportedLocale } from '~~/i18n/locales'

setupPageHeader()
setupGoogleAnalyticsConsent()
setupMetaPixelConsent()
setupTikTokPixelConsent()
setupOpenAIPixelConsent()
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

// The consent banner and its preferences, per tenant like the rest of
// the chrome (app/utils/variantRegistry.ts). Mounted here rather than in
// a layout so every layout — checkout and auth included — asks.
const cookieConsent = computed(() =>
  resolveChrome('cookie_consent', tenantStore.schemaName),
)

// Tenant-aware SEO metadata. siteConfig is already overridden per
// tenant by server/plugins/tenant-site-config.ts; tenantStore
// exposes the branding fields (logo, store name) — the env-level
// appTitle is only the no-tenant fallback.
const siteName = computed(
  () => tenantStore.storeName || config.public.appTitle,
)
const siteLogo = computed(
  () => ogImageUrl.value,
)

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
const storeLocation = useStoreLocation()

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
  const location = storeLocation.value
  return location
    ? { '@type': 'GeoCoordinates', 'latitude': location.lat, 'longitude': location.lng }
    : undefined
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

const takesOrders = useStoreFeature('cart')
const organizationType = computed(() => organizationSchemaType({
  takesOrders: takesOrders.value,
  hasPhysicalStore: hasBusinessHours.value || geo.value !== undefined,
}))

const localePath = useLocalePath()
const resolveSitePath = createSitePathResolver({ canonical: true, absolute: true, withBase: true })

// The store's shipping and return policies, from what it really offers
// (Google's organization-level merchant policies). The return policy is
// linked only once the store has published it; its terms (window, fees)
// are stated for the countries the store ships to once the store has set
// them (RETURN_WINDOW_DAYS, RETURN_FEES).
const { published: publishedContentPages } = useFooterContentPages()
const { data: shippingPolicy } = useApi('/api/shipping/policy', { key: 'shipping-policy' })
const returnWindowSetting = useSettingValue('RETURN_WINDOW_DAYS')
const returnFeesSetting = useSettingValue('RETURN_FEES')
const shippingServices = computed(() => {
  const services = shippingServicesSchema(shippingPolicy.value ?? [])
  return services.length > 0 ? services : undefined
})
const merchantReturnPolicy = computed(() => merchantReturnPolicySchema({
  link: publishedContentPages.value.has(LEGAL_ROUTE_SLUGS['return-policy'])
    ? resolveSitePath(localePath('return-policy')).value
    : undefined,
  windowDays: returnWindowDays(returnWindowSetting.value),
  fees: returnFees(returnFeesSetting.value),
  countries: [...new Set((shippingPolicy.value ?? []).map(entry => entry.countryCode))],
}))

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
  'hasShippingService': shippingServices,
  'hasMerchantReturnPolicy': merchantReturnPolicy,
}

// The WebSite and WebPage nodes are ours, not nuxt-schema-org's
// (`schemaOrg.defaults: false` in nuxt.config.ts): its defaults read the
// platform's locale list, so every store declared `en-US` and a
// translation at `/en`, which a Greek-only store answers with a 404, and
// unhead concatenates arrays on merge, so our node could not take them
// back. Each language is its own WebSite (`@id` per locale home, the
// module's shape), related to the others in the languages THIS store
// serves. A non-default WebSite is not the `#website` unhead links
// pages and publishers to by default, so both links are explicit.
const websiteIdFor = (code: SupportedLocale) =>
  `${resolveSitePath(localePath('index', code)).value}#website`
const currentLocale = computed(() => locale.value as SupportedLocale)
const websiteId = computed(() => websiteIdFor(currentLocale.value))
const translations = computed(() =>
  websiteTranslations(currentLocale.value, tenantStore.availableLocales, websiteIdFor),
)

// The translation relations are CreativeWork properties the WebSite
// definer's input type does not declare, so they attach after it, the
// same way the store's extras attach to the Organization node above.
const websiteNode = {
  ...defineWebSite({
    '@id': websiteId,
    'url': () => resolveSitePath(localePath('index')).value,
    'name': siteName,
    'description': siteConfig.description,
    'inLanguage': () => locales.value.find(l => l.code === currentLocale.value)?.language,
    'publisher': { '@id': () => `${withTrailingSlash(resolveSitePath('/').value)}#identity` },
  }),
  workTranslation: () => translations.value.workTranslation,
  translationOfWork: () => translations.value.translationOfWork,
}

useSchemaOrg([
  defineWebPage({
    isPartOf: { '@id': websiteId },
  }),
  websiteNode,
  organizationNode,
])
const shareImage = computed(() => shareImageMeta(siteLogo.value, siteName.value))
useSeoMeta({
  ogImage: () => shareImage.value.ogImage,
  ogImageAlt: () => shareImage.value.ogImageAlt,
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
    :toaster="{
      position: 'top-right',
      duration: 5000,
    }"
  >
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <component :is="cookieConsent" />
  </UApp>
</template>
