import { defineEventHandler } from 'h3'
import { defineCachedEventHandler } from 'nitropack/runtime'
import renderer from '#page-renderer'
import { CACHED_PAGE_VARIES, CUSTOM_PAGE_SWR_TTL, isCachedSsrRoute } from '~~/shared/constants/prerender'

/**
 * Nuxt's page renderer behind Nitro's page cache, as a cached route rule
 * wraps it: group, key and headers are the rules' own (nitropack
 * `runtime/internal/app`), so an entry is `nitro:routes:_:<slug>…` like
 * every cached page, and the edge directive (`server/plugins/edge-cache.ts`)
 * and Django's store-wide page purge reach it unchanged.
 */
const cachedRenderer = defineCachedEventHandler(renderer, {
  group: 'nitro/routes',
  swr: true,
  maxAge: CUSTOM_PAGE_SWR_TTL,
  varies: CACHED_PAGE_VARIES,
})

/**
 * The page renderer for `/*` and `/<locale>/*`, with Nitro's page cache in
 * front of a merchant's custom pages only (`CUSTOM_PAGE_ROUTES` in
 * `shared/constants/prerender.ts` says why a route rule cannot do this).
 *
 * Every other one-segment page reaching it (`/search`, `/en/cart`) goes to
 * the renderer itself, exactly as under the renderer's own `/**`. Not
 * through the cache's `shouldBypassCache`: Nitro 2 still renders a
 * bypassed request on its cache's copy of the request, which carries only
 * the `varies` headers, so `/checkout` would render without the visitor's
 * cookies. A one-segment page with a route rule of its own (`/about`,
 * `/offers`) never reaches this handler: Nitro registers that rule's
 * handler at the exact path, which the router prefers.
 *
 * Registered in `nuxt.config.ts` (`nitro.handlers`) rather than scanned:
 * it must answer exactly those routes.
 */
export default defineEventHandler(event =>
  isCachedSsrRoute(event.path.split('?')[0] ?? '') ? cachedRenderer(event) : renderer(event),
)
