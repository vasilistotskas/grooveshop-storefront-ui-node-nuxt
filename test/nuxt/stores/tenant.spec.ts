import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTenantStore } from '~/stores/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import type { TenantConfig } from '~~/shared/openapi/types.gen'

/**
 * The store's getters expose `TenantConfig` fields with a fallback for
 * when there is no config (probes, prerender, an unknown host) or the
 * payload omits an optional field. Most fall back to `''` — callers
 * substitute their own platform-level default — but the theme, the
 * currency and `blogEnabled` fall back to real values.
 *
 * Each test gets a fresh Pinia: the store is called directly, never
 * through a mounted component.
 */

const config = (overrides: Partial<TenantConfig> = {}): TenantConfig =>
  validTenantConfig('store.example', overrides)

/** The fields `zTenantConfig` lets a payload leave out. */
type OptionalKey = 'seoAuthor' | 'googleSiteVerification' | 'pinterestDomainVerify' | 'recommendationsEnabled' | 'openaiPixelId'

/** A valid payload that leaves out the optional `key`. */
function configWithout(key: OptionalKey): TenantConfig {
  const payload = config()
  delete payload[key]
  return payload
}

type Store = ReturnType<typeof useTenantStore>
type GetterRow = [keyof Store, keyof TenantConfig, unknown, unknown]

const OPTIONAL_KEYS: OptionalKey[] = ['seoAuthor', 'googleSiteVerification', 'pinterestDomainVerify', 'recommendationsEnabled', 'openaiPixelId']

/** [getter, config field, fallback, a value the config can carry] */
const GETTERS: GetterRow[] = [
  ['schemaName', 'schemaName', '', 'acme'],
  ['storeName', 'storeName', '', 'Acme'],
  ['storeDescription', 'storeDescription', '', 'Fine goods'],
  ['primaryDomain', 'primaryDomain', '', 'acme.example'],
  ['apiDomain', 'apiDomain', '', 'api.acme.example'],
  ['assetsDomain', 'assetsDomain', '', 'assets.acme.example'],
  ['staticDomain', 'staticDomain', '', 'static.acme.example'],
  ['primaryColor', 'primaryColor', 'neutral', 'emerald'],
  ['neutralColor', 'neutralColor', 'zinc', 'stone'],
  ['accentHex', 'accentHex', '#003DFF', '#FF5500'],
  ['logoLightUrl', 'logoLightUrl', '', 'https://assets.acme.example/logo.svg'],
  ['logoDarkUrl', 'logoDarkUrl', '', 'https://assets.acme.example/logo-dark.svg'],
  ['faviconUrl', 'faviconUrl', '', 'https://assets.acme.example/favicon.png'],
  ['defaultLocale', 'defaultLocale', '', 'en'],
  ['defaultCurrency', 'defaultCurrency', 'EUR', 'USD'],
  ['themePreset', 'themePreset', 'default', 'boutique'],
  ['stripePublishableKey', 'stripePublishableKey', '', 'pk_live_tenant_abc123'],
  ['metaPixelId', 'metaPixelId', '', '1234567890'],
  ['tiktokPixelId', 'tiktokPixelId', '', 'TT123'],
  ['openaiPixelId', 'openaiPixelId', '', 'oai_123'],
  ['gaTrackingId', 'gaTrackingId', '', 'G-TENANT12345'],
  ['googleAdsConversionId', 'googleAdsConversionId', '', 'AW-1'],
  ['googleAdsPurchaseLabel', 'googleAdsPurchaseLabel', '', 'purchase'],
  ['googleAdsAddToCartLabel', 'googleAdsAddToCartLabel', '', 'add'],
  ['googleAdsBeginCheckoutLabel', 'googleAdsBeginCheckoutLabel', '', 'begin'],
  ['googleAdsPageViewLabel', 'googleAdsPageViewLabel', '', 'view'],
  ['totpIssuer', 'totpIssuer', '', 'Acme'],
  ['boxNowPartnerId', 'boxNowPartnerId', '', '10391'],
  ['seoAuthor', 'seoAuthor', '', 'Store Owner'],
  ['googleSiteVerification', 'googleSiteVerification', '', 'gsv-token'],
  ['pinterestDomainVerify', 'pinterestDomainVerify', '', 'pin-token'],
  ['loyaltyEnabled', 'loyaltyEnabled', false, true],
  ['blogEnabled', 'blogEnabled', true, false],
  ['promotionsEnabled', 'promotionsEnabled', false, true],
  ['giftCardsEnabled', 'giftCardsEnabled', false, true],
  ['b2bEnabled', 'b2bEnabled', false, true],
  ['recommendationsEnabled', 'recommendationsEnabled', false, true],
  ['agentCommerceEnabled', 'agentCommerceEnabled', false, true],
]

describe('useTenantStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('falls back on every getter before a config is loaded', () => {
    const store = useTenantStore()
    const read = Object.fromEntries(GETTERS.map(([getter]) => [getter, store[getter]]))
    expect(read).toEqual(Object.fromEntries(GETTERS.map(([getter, , fallback]) => [getter, fallback])))
  })

  it.each(GETTERS)('%s follows the config field %s, and falls back to %j after setConfig(null)', (getter, key, fallback, value) => {
    const store = useTenantStore()
    store.setConfig(config({ [key]: value }))
    expect(store[getter]).toEqual(value)

    store.setConfig(null)
    expect(store[getter]).toEqual(fallback)
  })

  it.each(GETTERS.filter(([, key]) => (OPTIONAL_KEYS as string[]).includes(key)))(
    '%s falls back when the payload omits the optional %s',
    (getter, key, fallback) => {
      const store = useTenantStore()
      store.setConfig(configWithout(key as OptionalKey))
      expect(store[getter]).toEqual(fallback)
    },
  )

  describe('socials', () => {
    const NONE = {
      discord: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      pinterest: '',
      reddit: '',
      tiktok: '',
      twitter: '',
      youtube: '',
    }

    it('is all empty before a config is loaded', () => {
      expect(useTenantStore().socials).toEqual(NONE)
    })

    it('maps each socials* field to its network, and empties again after setConfig(null)', () => {
      const store = useTenantStore()
      store.setConfig(config({
        socialsDiscord: 'd',
        socialsFacebook: 'f',
        socialsInstagram: 'i',
        socialsLinkedin: 'l',
        socialsPinterest: 'p',
        socialsReddit: 'r',
        socialsTiktok: 't',
        socialsTwitter: 'x',
        socialsYoutube: 'y',
      }))
      expect(store.socials).toEqual({
        discord: 'd',
        facebook: 'f',
        instagram: 'i',
        linkedin: 'l',
        pinterest: 'p',
        reddit: 'r',
        tiktok: 't',
        twitter: 'x',
        youtube: 'y',
      })

      store.setConfig(null)
      expect(store.socials).toEqual(NONE)
    })
  })

  describe('isPlatform', () => {
    it('counts an absent config as platform (probes, prerender, unknown-host error page)', () => {
      expect(useTenantStore().isPlatform).toBe(true)
    })

    it('is the platform ONLY when the row flag says so — never from a hostname', () => {
      const store = useTenantStore()
      store.setConfig(config({ primaryDomain: 'store-one.example' }))
      expect(store.isPlatform).toBe(false)

      store.setConfig(config({ primaryDomain: 'store-one.example', isPlatformStorefront: true }))
      expect(store.isPlatform).toBe(true)
    })
  })

  describe('availableLocales / isMultilingual', () => {
    it('serves no locale before a config is loaded', () => {
      const store = useTenantStore()
      expect(store.availableLocales).toEqual([])
      expect(store.isMultilingual).toBe(false)
    })

    it.each<[string, Partial<TenantConfig>, string[], boolean]>([
      ['an empty list, as the default locale alone', { availableLocales: [], defaultLocale: 'en' }, ['en'], false],
      ['both platform locales', { availableLocales: ['el', 'en'] }, ['el', 'en'], true],
      ['only the platform locales it lists', { availableLocales: ['en', 'fr'] }, ['en'], false],
    ])('serves %s', (_label, overrides, locales, multilingual) => {
      const store = useTenantStore()
      store.setConfig(config(overrides))
      expect(store.availableLocales).toEqual(locales)
      expect(store.isMultilingual).toBe(multilingual)
    })
  })
})
