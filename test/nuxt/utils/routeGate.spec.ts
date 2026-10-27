import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteLocationNormalized } from 'vue-router'
import accountReviewsEnabled from '~/middleware/account-reviews-enabled'
import b2bEnabled from '~/middleware/b2b-enabled'
import blogEnabled from '~/middleware/blog-enabled'
import cartEnabled from '~/middleware/cart-enabled'
import catalogueEnabled from '~/middleware/catalogue-enabled'
import favouritesEnabled from '~/middleware/favourites-enabled'
import feedbackEnabled from '~/middleware/feedback-enabled'
import giftCardsEnabled from '~/middleware/gift-cards-enabled'
import loyaltyEnabled from '~/middleware/loyalty-enabled'
import newsletterEnabled from '~/middleware/newsletter-enabled'
import promotionsEnabled from '~/middleware/promotions-enabled'
import { createFeatureGate } from '~/utils/routeGate'
import { setTenant } from '~~/test/helpers/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

/**
 * The gates in front of a page. A gate decides from
 * `TenantConfig.features` (the cart and the catalogue included),
 * synchronously, and never reads the settings.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const SETTINGS = '/api/settings/public'
const to = { path: '/', fullPath: '/' } as RouteLocationNormalized
const ALL_OFF = validTenantConfig('test.local').features
const run = (gate: ReturnType<typeof createFeatureGate>) => Promise.resolve().then(() => gate(to, to))

const FEATURE_GATES = [
  ['account-reviews-enabled', accountReviewsEnabled, 'accountReviews'],
  ['b2b-enabled', b2bEnabled, 'wholesale'],
  ['blog-enabled', blogEnabled, 'blog'],
  ['cart-enabled', cartEnabled, 'cart'],
  ['catalogue-enabled', catalogueEnabled, 'catalogue'],
  ['favourites-enabled', favouritesEnabled, 'favourites'],
  ['feedback-enabled', feedbackEnabled, 'feedback'],
  ['gift-cards-enabled', giftCardsEnabled, 'giftCards'],
  ['loyalty-enabled', loyaltyEnabled, 'loyalty'],
  ['newsletter-enabled', newsletterEnabled, 'newsletter'],
  ['promotions-enabled', promotionsEnabled, 'promotions'],
] as const

describe('feature-gate middlewares', () => {
  beforeEach(() => {
    clearNuxtData()
    api.routes({ [SETTINGS]: { settings: {} } })
  })

  describe.each(FEATURE_GATES)('%s', (_name, gate, feature) => {
    const everythingBut = (on: boolean) => Object.fromEntries(
      Object.keys(ALL_OFF).map(name => [name, name === feature ? on : !on]),
    ) as TenantConfig['features']

    it(`404s when ${feature} is off, whatever else is on`, async () => {
      setTenant({ features: everythingBut(false) })

      await expect(run(gate)).rejects.toMatchObject({ statusCode: 404 })
    })

    it(`serves the page when ${feature} is on, whatever else is off`, async () => {
      setTenant({ features: everythingBut(true) })

      await expect(run(gate)).resolves.toBeUndefined()
    })

    it('decides from features alone: no settings request, no plan flag', async () => {
      setTenant({
        features: everythingBut(false),
        loyaltyEnabled: true,
        blogEnabled: true,
        promotionsEnabled: true,
        giftCardsEnabled: true,
        b2bEnabled: true,
      })
      api.routes({ [SETTINGS]: { settings: Object.fromEntries(Object.keys(ALL_OFF).map(k => [k, 'True'])) } })

      await expect(run(gate)).rejects.toMatchObject({ statusCode: 404 })
      expect(api.callsTo(SETTINGS)).toEqual([])
    })
  })
})

describe('createFeatureGate', () => {
  it('serves the page once the feature is switched on, with no reload', async () => {
    const gate = createFeatureGate('giftCards')
    setTenant({ features: { ...ALL_OFF, giftCards: false } })
    await expect(run(gate)).rejects.toMatchObject({ statusCode: 404 })

    setTenant({ features: { ...ALL_OFF, giftCards: true } })
    await expect(run(gate)).resolves.toBeUndefined()
  })
})
