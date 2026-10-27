import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteMiddleware } from '#app'
import type { RouteLocationNormalized } from 'vue-router'
import blogEnabled from '~/middleware/blog-enabled'
import cartEnabled from '~/middleware/cart-enabled'
import catalogueEnabled from '~/middleware/catalogue-enabled'
import feedbackEnabled from '~/middleware/feedback-enabled'
import giftCardsEnabled from '~/middleware/gift-cards-enabled'
import loyaltyEnabled from '~/middleware/loyalty-enabled'
import promotionsEnabled from '~/middleware/promotions-enabled'
import { FEATURE_GATED_ROUTES, featureRouteAllowed } from '~~/shared/utils/gatedRoutes'
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

const MIDDLEWARE: Record<string, RouteMiddleware> = {
  'blog-enabled': blogEnabled,
  'catalogue-enabled': catalogueEnabled,
  'feedback-enabled': feedbackEnabled,
  'gift-cards-enabled': giftCardsEnabled,
  'loyalty-enabled': loyaltyEnabled,
  'promotions-enabled': promotionsEnabled,
}

const FEATURES = validTenantConfig('test.local').features
const featuresWith = (on: boolean) =>
  Object.fromEntries(Object.keys(FEATURES).map(name => [name, on])) as TenantConfig['features']

function middlewaresOf(path: string): RouteMiddleware[] {
  const names = [useRouter().resolve(path).meta.middleware ?? []].flat()
  return names.map((name) => {
    const middleware = typeof name === 'string' ? MIDDLEWARE[name] : undefined
    if (!middleware) throw new Error(`${path}: no middleware in this spec for ${String(name)}`)
    return middleware
  })
}

/** `'served'`, or the status the middleware chain threw. */
async function outcome(path: string): Promise<'served' | number | undefined> {
  const to = useRouter().resolve(path) as unknown as RouteLocationNormalized
  try {
    for (const middleware of middlewaresOf(path)) await middleware(to, to)
    return 'served'
  }
  catch (error) {
    return (error as { statusCode?: number }).statusCode
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
