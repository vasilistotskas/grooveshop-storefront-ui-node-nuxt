/**
 * Gate for locale prefixes the current tenant does not serve.
 *
 * i18n routes are generated at BUILD time from the platform-wide
 * `SUPPORTED_LOCALES`, so every locale exists as a route for every
 * tenant. Without this gate, adding a locale to the platform would
 * immediately expose `/<locale>/**` on every store — English chrome
 * wrapped around untranslated content, and a second indexable URL for
 * every page on tenants that never asked for it.
 *
 * `Tenant.available_locales` is the per-tenant allow-list. Empty means
 * single-language on `defaultLocale`, which is the default, so tenants
 * that predate the field keep exactly the behaviour they had.
 *
 * Fail-open: a tenant config that has not resolved yet must not 404 a
 * legitimate page, matching `createSettingGate`.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { locale, defaultLocale } = useI18n()
  const tenantStore = useTenantStore()

  // Not resolved yet (or resolution failed) — fail open.
  if (!tenantStore.config) return

  const allowed = tenantAllowedLocales(tenantStore.config)
  if (!allowed.length) return

  // The route's locale comes from its URL prefix under
  // `prefix_except_default`, so this only fires for a prefix that was
  // typed or crawled — `server/middleware/1.locale.ts` already clamps
  // DETECTION to the tenant's set, so no legitimate visitor is routed
  // here. That is also why a 404 is safe rather than a redirect: a
  // redirect would bounce against the i18n cookie.
  const current = String(locale.value || defaultLocale)

  // A tenant whose allow-list omitted its own default locale would 404
  // its entire site. Tenant.clean() forbids that; be defensive anyway.
  if (current === defaultLocale && !allowed.includes(current)) return

  if (!allowed.includes(current)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      data: { locale: current, path: to.fullPath },
    })
  }
})
