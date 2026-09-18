/**
 * The ONE Google tag on the page, shared by GA4 and Google Ads.
 *
 * Google ships a single loader (`gtag.js`) for both products: it is
 * loaded once with any tag id, and further ids are attached with
 * `gtag('config', id)`. GA4 events and Ads conversion events then ride
 * the same `gtag` and the same Consent Mode state. Before this, GA4 was
 * the only consumer and `useGA4` registered the script itself; adding
 * Ads as a second registration would have been two owners of one tag.
 *
 * Who loads it: `setupGoogleAnalyticsConsent` (app.vue), with the
 * interaction-or-5s trigger that keeps 173KB off the pre-LCP path and
 * the denied-by-default consent block. Every OTHER registration — this
 * composable — passes `trigger: 'manual'`, which arms nothing: unhead
 * re-runs `setupTriggerHandler` on every deduped `useScript*` call, so
 * a consumer that omitted the trigger inherited `onNuxtReady` and
 * quietly loaded the tag early (that is exactly what `useGA4` did).
 *
 * Tenant-only ids, no platform/env fallback: a shared id would mix
 * analytics and conversions across merchants.
 */

const GA4_ID = /^G-[A-Z0-9]{8,}$/
const GOOGLE_ADS_ID = /^AW-\d{6,}$/
const GA4_PLACEHOLDER = 'G-XXXXXXXXXX'

/**
 * Consent Mode v2 defaults, everything denied until the banner is
 * answered. Keep identical in every registration: `@nuxt/scripts` dedups
 * on the key and the FIRST registration's consent block wins, so a
 * registration without it would let gtag set `_ga` and send hits
 * before consent.
 */
export const GOOGLE_TAG_DEFAULT_CONSENT = {
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  ad_storage: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'granted',
  personalization_storage: 'denied',
  security_storage: 'denied',
  wait_for_update: 500,
} as const

export interface GoogleTagIds {
  /** The GA4 measurement id, or '' when unprovisioned/placeholder. */
  gaId: string
  /** The Google Ads conversion id, or '' when unprovisioned. */
  adsId: string
  /**
   * The id `gtag.js` is loaded with. GA4 when the store has it, else
   * Ads: a store can run conversion tracking without analytics, and
   * the loader accepts either.
   */
  tagId: string
}

/** Pure, so the id rules are testable without a Nuxt context. */
export function googleTagIds(tenant: {
  gaTrackingId: string
  googleAdsConversionId: string
}): GoogleTagIds {
  const ga = tenant.gaTrackingId
  const gaId = ga && ga !== GA4_PLACEHOLDER && GA4_ID.test(ga) ? ga : ''
  const ads = tenant.googleAdsConversionId
  const adsId = ads && GOOGLE_ADS_ID.test(ads) ? ads : ''
  return { gaId, adsId, tagId: gaId || adsId }
}

const NOOP = () => undefined

export function useGoogleTag() {
  const tenantStore = useTenantStore()
  const ids = googleTagIds({
    gaTrackingId: tenantStore.gaTrackingId,
    googleAdsConversionId: tenantStore.googleAdsConversionId,
  })
  const isProvisioned = !!ids.tagId

  // `import.meta.client` mirrors the pixels: the registry script is
  // client-only and SSR must never register it.
  const proxy = isProvisioned && import.meta.client
    ? (useScriptGoogleAnalytics({
        id: ids.tagId,
        scriptOptions: { trigger: 'manual' },
        defaultConsent: GOOGLE_TAG_DEFAULT_CONSENT,
      }) as any).proxy
    : null

  const gtag = (...args: unknown[]): void => {
    if (!proxy) {
      NOOP()
      return
    }
    proxy.gtag(...args)
  }

  return { ...ids, isProvisioned, gtag }
}
