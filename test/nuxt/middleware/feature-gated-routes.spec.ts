import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteMiddleware } from '#app'
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
import { FEATURE_GATED_ROUTES, blockedFeaturePaths, featureRouteAllowed, isFeaturePathBlocked } from '~~/shared/utils/gatedRoutes'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * `FEATURE_GATED_ROUTES` + `featureRouteAllowed` are the sitemap's and
 * the menus' copy of what each gated page's middleware decides. The
 * copy is only worth anything while it AGREES with the page: a link the
 * table allows to a page its middleware 404s is a dead link on every
 * page of the store.
 *
 * So for every table row this resolves the route through the real
 * router, runs the middleware its `definePageMeta` names, and compares
 * the outcome with `featureRouteAllowed` across every state of the
 * route's features, read from the tenant payload.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

/** Every feature gate a page can name (`app/middleware/*-enabled.ts`). */
const MIDDLEWARE: Record<string, RouteMiddleware> = {
  'account-reviews-enabled': accountReviewsEnabled,
  'b2b-enabled': b2bEnabled,
  'blog-enabled': blogEnabled,
  'cart-enabled': cartEnabled,
  'catalogue-enabled': catalogueEnabled,
  'favourites-enabled': favouritesEnabled,
  'feedback-enabled': feedbackEnabled,
  'gift-cards-enabled': giftCardsEnabled,
  'loyalty-enabled': loyaltyEnabled,
  'newsletter-enabled': newsletterEnabled,
  'promotions-enabled': promotionsEnabled,
}

const isFeatureGate = (name: unknown): name is string => typeof name === 'string' && name.endsWith('-enabled')

const FEATURES = validTenantConfig('test.local').features
const featuresWith = (on: boolean) =>
  Object.fromEntries(Object.keys(FEATURES).map(name => [name, on])) as TenantConfig['features']

function middlewaresOf(path: string): RouteMiddleware[] {
  const names = [useRouter().resolve(path).meta.middleware ?? []].flat().filter(isFeatureGate)
  return names.map((name) => {
    const middleware = typeof name === 'string' ? MIDDLEWARE[name] : undefined
    if (!middleware) throw new Error(`${path}: no middleware in this spec for ${String(name)}`)
    return middleware
  })
}

/**
 * `'served'`, or the 404 a gate threw. Anything else fails the spec: a
 * page naming a gate this spec does not list (`middlewaresOf` throws), or
 * a gate that throws something other than its 404, would otherwise read
 * as neither and pass every check below without its gate having run.
 */
async function outcome(path: string): Promise<'served' | 404> {
  const to = useRouter().resolve(path) as unknown as RouteLocationNormalized
  const gates = middlewaresOf(path)
  try {
    for (const middleware of gates) await middleware(to, to)
    return 'served'
  }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) return 404
    throw error
  }
}

/** Every feature on, every feature off, and each of a route's own features off alone. */
const CASES = FEATURE_GATED_ROUTES.flatMap(route => [
  { route, label: `${route.path}, every feature on`, features: featuresWith(true) },
  { route, label: `${route.path}, every feature off`, features: featuresWith(false) },
  ...(route.features ?? []).map(off => ({
    route,
    label: `${route.path}, only ${off} off`,
    features: { ...featuresWith(true), [off]: false } as TenantConfig['features'],
  })),
])

describe('FEATURE_GATED_ROUTES agrees with the page middlewares', () => {
  it.each(FEATURE_GATED_ROUTES.map(route => [route.path]))('%s is guarded by a middleware', (path) => {
    expect(middlewaresOf(path).length).toBeGreaterThan(0)
  })

  it.each(CASES)('$label', async ({ route, features }) => {
    const tenant = { features }
    setTenant(tenant)

    const allowed = featureRouteAllowed(route, tenant)
    expect(await outcome(route.path)).toBe(allowed ? 'served' : 404)
  })
})

/**
 * The other direction: every page a feature gate guards is in the table,
 * so no menu or sitemap can link to it while it 404s. `/search`, the
 * cart, the checkout and five account pages were gated and missing, and
 * the menus linked to them with the feature off.
 */
describe('every feature-gated page is in FEATURE_GATED_ROUTES', () => {
  /** Each gated page once, in the default language, its params filled in. */
  const gatedPages = () => useRouter().getRoutes()
    .filter(record => !record.path.startsWith('/en/') && record.path !== '/en')
    .filter(record => [record.meta.middleware ?? []].flat().some(isFeatureGate))
    .map(record => record.path.replace(/:[^/()]+(\([^)]*\))?\??/g, '1'))

  it('finds the gated pages', () => {
    // The listing, a product, search, the cart, the checkout, the blog,
    // the account's gated pages, the gift cards, the offers: a walk that
    // found none would pass for the wrong reason.
    expect(gatedPages().length).toBeGreaterThanOrEqual(20)
  })

  it('blocks every link to a gated page while its page 404s', async () => {
    const leaks: string[] = []
    for (const path of gatedPages()) {
      const gates = [useRouter().resolve(path).meta.middleware ?? []].flat().filter(isFeatureGate)
      for (const gate of gates) {
        // The gate's own feature off, every other on.
        for (const feature of Object.keys(FEATURES)) {
          const features = { ...featuresWith(true), [feature]: false } as TenantConfig['features']
          setTenant({ features })
          const status = await outcome(path)
          const linkable = !isFeaturePathBlocked(path, blockedFeaturePaths({ features }))
          if (status === 404 && linkable) leaks.push(`${path} (${gate}, ${feature} off)`)
        }
      }
    }
    expect(leaks).toEqual([])
  })
})

describe('the pages that need the cart', () => {
  // `/checkout` creates an order from a cart: its first gate is the
  // cart's (the others are inline functions, which only run past it), so a
  // store without the cart never reaches the order-creating page.
  it('/checkout is gated by cart-enabled before anything else', async () => {
    setTenant({ features: { ...featuresWith(true), cart: false } })
    const to = useRouter().resolve('/checkout') as unknown as RouteLocationNormalized
    const [first] = [to.meta.middleware ?? []].flat()

    expect(first).toBe('cart-enabled')
    await expect(Promise.resolve().then(() => cartEnabled(to, to))).rejects.toMatchObject({ statusCode: 404 })
  })
})
