import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteMiddleware } from '#app'
import type { RouteLocationNormalized } from 'vue-router'
import blogEnabled from '~/middleware/blog-enabled'
import catalogueEnabled from '~/middleware/catalogue-enabled'
import feedbackEnabled from '~/middleware/feedback-enabled'
import giftCardsEnabled from '~/middleware/gift-cards-enabled'
import loyaltyEnabled from '~/middleware/loyalty-enabled'
import promotionsEnabled from '~/middleware/promotions-enabled'
import { FEATURE_GATED_ROUTES, featureRouteAllowed } from '~~/shared/utils/gatedRoutes'
import type { FeatureGatedRoute } from '~~/shared/utils/gatedRoutes'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { setTenant } from '~~/test/helpers/tenant'
import { failWith } from '~~/test/helpers/api'

/**
 * `FEATURE_GATED_ROUTES` + `featureRouteAllowed` are the sitemap's and
 * the menus' copy of what each gated page's middleware decides. The
 * copy is only worth anything while it AGREES with the page: a link the
 * table allows to a page its middleware 404s is a dead link on every
 * page of the store.
 *
 * So for every table row this resolves the route through the real
 * router, runs the middleware its `definePageMeta` names, and compares
 * the outcome with `featureRouteAllowed` across the route's feature and
 * (for the catalogue, the one preference left) every state of its
 * setting — on, off, no row, lookup failed.
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

/**
 * A setting row as the merchant can store it: Django writes a bool row as
 * "True"/"False", and a string-typed row can hold any spelling
 * `parseSettingFlag` accepts. Every gate must read them all the same way
 * (a loyalty gate that accepted only "true" 404'd a store that typed "1").
 */
const SETTING_STATES = {
  'on': 'True',
  'on, typed 1': '1',
  'on, typed yes': 'yes',
  'on, padded capitals': ' YES ',
  'off': 'False',
  'off, typed 0': '0',
  'missing': undefined,
  'unreadable': null,
} as const
type SettingState = keyof typeof SETTING_STATES

function settingsFor(route: FeatureGatedRoute, state: SettingState): Record<string, string> | null {
  const raw = SETTING_STATES[state]
  if (raw === null) return null
  if (raw === undefined || !route.preference) return {}
  return { [route.preference]: raw }
}

/** Serve `settings` the way `storePreferenceEnabled` reads them: the public-settings map. */
function serve(settings: Record<string, string> | null) {
  api.routes({
    '/api/settings/public': settings === null ? failWith(502) : { settings },
  })
}

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

const CASES = FEATURE_GATED_ROUTES.flatMap(route =>
  [true, false].flatMap(featuresOn =>
    (Object.keys(SETTING_STATES) as SettingState[]).map(state => ({
      route,
      featuresOn,
      state,
      label: `${route.path}, features ${featuresOn ? 'on' : 'off'}, setting ${state}`,
    })),
  ),
)

describe('FEATURE_GATED_ROUTES agrees with the page middlewares', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  it.each(FEATURE_GATED_ROUTES.map(route => [route.path]))('%s is guarded by a middleware', (path) => {
    expect(middlewaresOf(path).length).toBeGreaterThan(0)
  })

  it.each(CASES)('$label', async ({ route, featuresOn, state }) => {
    const tenant = { features: featuresWith(featuresOn) }
    setTenant(tenant)
    const settings = settingsFor(route, state)
    serve(settings)

    const allowed = featureRouteAllowed(route, tenant, settings)
    expect(await outcome(route.path)).toBe(allowed ? 'served' : 404)
  })
})
