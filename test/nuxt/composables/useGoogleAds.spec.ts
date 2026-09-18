/**
 * Tests for app/composables/useGoogleAds.ts and the tag it rides on
 * (useGoogleTag). Both are TENANT-ONLY — no platform/env fallback — and
 * every conversion is `gtag('event', 'conversion', { send_to:
 * 'AW-<id>/<label>', ... })` on the ONE Google tag GA4 also uses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'

const { gtagMock, scriptGoogleAnalyticsMock } = vi.hoisted(() => {
  const gtagMock = vi.fn()
  return {
    gtagMock,
    scriptGoogleAnalyticsMock: vi.fn(() => ({
      proxy: { gtag: gtagMock },
      consent: { update: vi.fn() },
    })),
  }
})
mockNuxtImport('useScriptGoogleAnalytics', () => scriptGoogleAnalyticsMock)

const { useGoogleAds } = await import('~/composables/useGoogleAds')
const { useGoogleTag, googleTagIds } = await import('~/composables/useGoogleTag')

const ADS = 'AW-18429554292'
const LABELS = {
  googleAdsPurchaseLabel: '7T1qCJOa0vocEPTc8tNE',
  googleAdsAddToCartLabel: 'Z2D-CPLn1PocEPTc8tNE',
  googleAdsBeginCheckoutLabel: 'teQICK2s1_ocEPTc8tNE',
  googleAdsPageViewLabel: 'x3diCPOe1_ocEPTc8tNE',
}

function setTenant(overrides: Record<string, unknown>) {
  const tenantStore = useTenantStore()
  tenantStore.setConfig({
    ...(tenantStore.config ?? {}),
    gaTrackingId: '',
    googleAdsConversionId: '',
    googleAdsPurchaseLabel: '',
    googleAdsAddToCartLabel: '',
    googleAdsBeginCheckoutLabel: '',
    googleAdsPageViewLabel: '',
    ...overrides,
  } as TenantConfig)
}

beforeEach(() => {
  setActivePinia(createPinia())
  gtagMock.mockClear()
  scriptGoogleAnalyticsMock.mockClear()
})

describe('googleTagIds — which id loads the tag', () => {
  it('loads with GA4 when the store has it, and attaches Ads separately', () => {
    expect(googleTagIds({ gaTrackingId: 'G-GGKMZ8YLNN', googleAdsConversionId: ADS }))
      .toEqual({ gaId: 'G-GGKMZ8YLNN', adsId: ADS, tagId: 'G-GGKMZ8YLNN' })
  })

  it('loads with the Ads id alone when there is no GA4', () => {
    // Conversion tracking without analytics is a legitimate store.
    expect(googleTagIds({ gaTrackingId: '', googleAdsConversionId: ADS }))
      .toEqual({ gaId: '', adsId: ADS, tagId: ADS })
  })

  it('treats the GA4 placeholder and malformed ids as unprovisioned', () => {
    expect(googleTagIds({ gaTrackingId: 'G-XXXXXXXXXX', googleAdsConversionId: '' }).tagId).toBe('')
    expect(googleTagIds({ gaTrackingId: 'UA-1234-1', googleAdsConversionId: 'AW-' }).tagId).toBe('')
  })
})

describe('useGoogleTag — one registration shape', () => {
  it('registers with trigger manual and the denied-by-default consent', () => {
    setTenant({ gaTrackingId: 'G-GGKMZ8YLNN' })

    useGoogleTag()

    expect(scriptGoogleAnalyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'G-GGKMZ8YLNN',
        // 'manual' arms nothing; a consumer that omitted the trigger
        // inherited onNuxtReady and loaded the tag early.
        scriptOptions: expect.objectContaining({ trigger: 'manual' }),
        defaultConsent: expect.objectContaining({ ad_storage: 'denied', analytics_storage: 'denied' }),
      }),
    )
  })

  it('does not register at all for a store with no Google ids', () => {
    setTenant({})

    const { isProvisioned } = useGoogleTag()

    expect(isProvisioned).toBe(false)
    expect(scriptGoogleAnalyticsMock).not.toHaveBeenCalled()
  })
})

describe('useGoogleAds — conversions', () => {
  it('sends the purchase with the real value, currency, transaction id and new_customer', () => {
    setTenant({ googleAdsConversionId: ADS, ...LABELS })

    useGoogleAds().trackPurchase({
      value: 59.98,
      currency: 'EUR',
      transactionId: '281',
      newCustomer: true,
    })

    expect(gtagMock).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${ADS}/${LABELS.googleAdsPurchaseLabel}`,
      value: 59.98,
      currency: 'EUR',
      transaction_id: '281',
      new_customer: true,
    })
  })

  it('omits new_customer when it is not known, rather than guessing', () => {
    setTenant({ googleAdsConversionId: ADS, ...LABELS })

    useGoogleAds().trackPurchase({ value: 10, currency: 'EUR', transactionId: '1' })

    expect(gtagMock.mock.calls[0]![2]).not.toHaveProperty('new_customer')
  })

  it('routes each action to its own label', () => {
    setTenant({ googleAdsConversionId: ADS, ...LABELS })
    const ads = useGoogleAds()

    ads.trackAddToCart({ value: 12.5, currency: 'EUR' })
    ads.trackBeginCheckout({ value: 40, currency: 'EUR' })
    ads.trackPageView()

    expect(gtagMock.mock.calls.map(c => (c[2] as any).send_to)).toEqual([
      `${ADS}/${LABELS.googleAdsAddToCartLabel}`,
      `${ADS}/${LABELS.googleAdsBeginCheckoutLabel}`,
      `${ADS}/${LABELS.googleAdsPageViewLabel}`,
    ])
  })

  it('sends a page view without a value', () => {
    // Google's snippet ships value: 1.0 as a placeholder; a page view
    // has no value and one euro per view is noise in reporting.
    setTenant({ googleAdsConversionId: ADS, ...LABELS })

    useGoogleAds().trackPageView()

    expect(gtagMock.mock.calls[0]![2]).toEqual({
      send_to: `${ADS}/${LABELS.googleAdsPageViewLabel}`,
    })
  })

  it('reports nothing for an action with no label', () => {
    setTenant({
      googleAdsConversionId: ADS,
      googleAdsPurchaseLabel: LABELS.googleAdsPurchaseLabel,
    })
    const ads = useGoogleAds()

    ads.trackAddToCart({ value: 1, currency: 'EUR' })
    ads.trackPageView()

    expect(ads.hasConversion('purchase')).toBe(true)
    expect(ads.hasConversion('add_to_cart')).toBe(false)
    expect(gtagMock).not.toHaveBeenCalled()
  })

  it('reports nothing at all for a store with labels but no id', () => {
    // The API refuses this state, but the storefront must not build a
    // send_to of '/LABEL' if it ever sees one.
    setTenant({ ...LABELS })

    const ads = useGoogleAds()
    ads.trackPurchase({ value: 1, currency: 'EUR', transactionId: '1' })

    expect(ads.isProvisioned).toBe(false)
    expect(gtagMock).not.toHaveBeenCalled()
  })

  it('rides the SAME tag as GA4 rather than registering a second one', () => {
    setTenant({ gaTrackingId: 'G-GGKMZ8YLNN', googleAdsConversionId: ADS, ...LABELS })

    useGoogleAds().trackAddToCart({ value: 1, currency: 'EUR' })

    // Registered with the GA4 id — Ads is attached via gtag('config')
    // by the loader, not by a registration of its own.
    expect(scriptGoogleAnalyticsMock).toHaveBeenCalledTimes(1)
    expect(scriptGoogleAnalyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'G-GGKMZ8YLNN' }),
    )
  })
})
