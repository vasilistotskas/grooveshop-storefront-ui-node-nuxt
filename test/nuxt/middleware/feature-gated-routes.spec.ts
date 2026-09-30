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
import type { FeatureGatedRoute, PlanFlags } from '~~/shared/utils/gatedRoutes'
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
 * the outcome with `featureRouteAllowed` across the plan flag and every
 * state of the setting — on, off, no row, lookup failed.
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

const PLAN_OFF: PlanFlags = {
  loyaltyEnabled: false,
  blogEnabled: false,
  promotionsEnabled: false,
  giftCardsEnabled: false,
}
const PLAN_ON: PlanFlags = {
  loyaltyEnabled: true,
  blogEnabled: true,
  promotionsEnabled: true,
  giftCardsEnabled: true,
}

type SettingState = 'on' | 'off' | 'missing' | 'unreadable'
const SETTING_STATES: SettingState[] = ['on', 'off', 'missing', 'unreadable']

function settingsFor(route: FeatureGatedRoute, state: SettingState): Record<string, string> | null {
  if (state === 'unreadable') return null
  if (state === 'missing' || !route.settingKey) return {}
  return { [route.settingKey]: state === 'on' ? 'True' : 'False' }
}

/**
 * Serve `settings` the way each transport does: the public-settings map
 * `settingEnabled` reads, and `/api/loyalty/settings`, which answers ''
 * for a key without a row (server/api/loyalty/settings.get.ts).
 */
function serve(settings: Record<string, string> | null) {
  const unavailable = failWith(502)
  api.routes({
    '/api/settings/public': settings === null ? unavailable : { settings },
    '/api/loyalty/settings': settings === null
      ? unavailable
      : (_url: string, options: { query: { keys: string } }) =>
          Object.fromEntries(options.query.keys.split(',').map(key => [key, settings[key] ?? ''])),
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
  [PLAN_ON, PLAN_OFF].flatMap(plan =>
    SETTING_STATES.map(state => ({
      route,
      plan,
      state,
      label: `${route.path}, plan ${plan === PLAN_ON ? 'on' : 'off'}, setting ${state}`,
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

  it.each(CASES)('$label', async ({ route, plan, state }) => {
    setTenant({ ...plan })
    const settings = settingsFor(route, state)
    serve(settings)

    const allowed = featureRouteAllowed(route, plan, settings)
    expect(await outcome(route.path)).toBe(allowed ? 'served' : 404)
  })
})
