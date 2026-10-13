/**
 * Factory for route middlewares that gate a page behind boolean
 * merchant extra-settings (single-tier — no Tenant plan flag; contrast
 * app/middleware/loyalty-enabled.ts for the two-tier shape). Every key
 * must be on: a page that belongs to a feature AND has its own switch
 * names both.
 *
 * Disabled means a hard 404 so the page is indistinguishable from a
 * route that never existed. Fails OPEN on fetch failure: an
 * unavailable settings endpoint must not take a page down for stores
 * that have it enabled (every gated setting defaults to enabled) —
 * which is what `settingEnabled`'s `fallback` argument carries.
 */
export function createSettingGate(...keys: [string, ...string[]]) {
  return defineNuxtRouteMiddleware(async () => {
    const enabled = await Promise.all(keys.map(key => settingEnabled(key, { fallback: true })))
    if (enabled.every(Boolean)) return

    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  })
}
