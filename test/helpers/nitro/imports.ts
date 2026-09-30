/**
 * Server auto-imports that cannot resolve to their real module in the
 * `unit` project, and so resolve to `./runtime.ts` instead.
 *
 * `vitest.config.mts` gives the source under `server/` the same import
 * resolution the Nitro build does (unimport, h3's names filtered as
 * nitropack filters them, `server/utils/**` and `shared/**`). The names
 * below are the rest: Nitro's own runtime imports `#nitro-internal-virtual/*`,
 * which exists only inside a build, and the module-provided helpers
 * (evlog, nuxt-auth-utils, nuxt-site-config, @nuxtjs/sitemap) import
 * `#imports` or virtual modules of their own. The list is the whole
 * contract with the shim: a name missing here fails as a
 * `ReferenceError` in the spec that needs it, never silently, and
 * `test/fixtures/setup/nitro.ts` fails the run if `runtime.ts` stops
 * exporting one of them.
 *
 * Only the names the specs' sources need are listed — add one when a
 * spec needs it. Some server source uses names that are not here yet
 * (`defineOAuthGoogleEventHandler` / `defineOAuthFacebookEventHandler` in
 * `server/routes/auth/*.get.ts`, which have no spec). The full set a
 * build provides is in `.nuxt/types/nitro-imports.d.ts`.
 *
 * Plain data, no imports: the vitest config loads this file.
 */
export const NITRO_SHIM_IMPORTS = [
  // nitropack/runtime/internal/*
  'useRuntimeConfig',
  'defineNitroPlugin',
  'defineCachedEventHandler',
  'defineCachedFunction',
  'useStorage',
  'useEvent',
  // evlog
  'log',
  'useLogger',
  // nuxt-auth-utils
  'getUserSession',
  'setUserSession',
  'replaceUserSession',
  'clearUserSession',
  'requireUserSession',
  // nuxt-site-config
  'getSiteConfig',
  'updateSiteConfig',
  // @nuxtjs/sitemap
  'defineSitemapEventHandler',
  'asSitemapUrl',
] as const

export type NitroShimImport = typeof NITRO_SHIM_IMPORTS[number]
