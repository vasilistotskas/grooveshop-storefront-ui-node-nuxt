/**
 * Factory for route middlewares that gate a page behind a boolean
 * merchant extra-setting (single-tier — no Tenant plan flag; contrast
 * app/middleware/loyalty-enabled.ts for the two-tier shape).
 *
 * Disabled means a hard 404 so the page is indistinguishable from a
 * route that never existed. Fails OPEN on fetch failure: an
 * unavailable settings endpoint must not take a page down for stores
 * that have it enabled (every gated setting defaults to enabled) —
 * which is what `settingEnabled`'s `fallback` argument carries.
 */
export function createSettingGate(key: string) {
  return defineNuxtRouteMiddleware(async () => {
    if (await settingEnabled(key, true)) return

    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  })
}
