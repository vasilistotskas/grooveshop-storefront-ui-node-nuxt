import { localeFromPath } from '~~/shared/i18n/localeFromPath'

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
 * The locale comes from the ROUTE, via `localeFromPath`, and NOT from
 * `useI18n()`. That composable is only valid at the top of a component
 * `setup()`; a global route middleware is not one, and calling it here
 * threw "Must be called at the top of a `setup` function" before any
 * component rendered — 500 on every page of every tenant, which is how
 * this shipped in v3.168.0. Under `prefix_except_default` the URL
 * carries the locale anyway, so no context is needed to read it.
 *
 * Fail-open: a tenant config that has not resolved yet must not 404 a
 * legitimate page, matching `createSettingGate`.
 */
export default defineNuxtRouteMiddleware((to) => {
  const tenantStore = useTenantStore()

  // Not resolved yet (or resolution failed) — fail open.
  if (!tenantStore.config) return

  // This fires only for a prefix that was typed or crawled, which is
  // why a 404 is safe here: nothing routes a legitimate visitor to a
  // locale their store does not serve.
  //
  // That holds because browser-language detection is off platform-wide
  // (`detectBrowserLanguage: false` in `nuxt.config.ts`). While it was
  // on, it matched `navigator.languages` against the BUILD-TIME locale
  // list — which cannot see `Tenant.available_locales` — and redirected
  // `/` onto a prefix this guard then 404s, so an English-preferring
  // browser met an error page on the store's own homepage.
  const current = localeFromPath(to.path)

  // `servedLocale` is the rule the server locale middleware applies too:
  // a prefix the tenant does not serve is not rendered as itself, and
  // the unprefixed default always is.
  if (servedLocale(current, tenantStore.config) !== current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      data: { locale: current, path: to.fullPath },
    })
  }
})
