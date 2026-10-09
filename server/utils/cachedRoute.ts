import type { EventHandler, EventHandlerRequest } from 'h3'
import { defineCachedEventHandler } from 'nitropack/runtime'
import type { CachedEventHandlerOptions } from 'nitropack/types'
import { defineEventHandler } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * A route whose responses Nitro caches, written as a `nuxt/server` handler.
 *
 * Caching is Nitro's (`defineCachedEventHandler`), as Nuxt's server-imports
 * guide says it must be: `nuxt/server` has no cache, and the Django admin
 * purges these entries by their `nitro:handlers:<name>` keys. The handler
 * itself is portable, so the route reads like every other.
 *
 * Nitro 2 types the handler it caches on h3 v1's event, which is not the
 * web-shaped `RequestEvent`; at runtime there is no difference, because
 * `nuxt/server`'s `defineEventHandler` already gives the handler the
 * portable view of that same event (`test/unit/server/utils/cachedRoute.spec.ts`).
 * The assertion below is that typing gap and nothing else. Nuxt 5 runs
 * Nitro v3, whose h3 v2 event is a `RequestEvent`: this becomes
 * `defineCachedHandler` from `nitro/cache`, with no assertion.
 *
 * The cache options stay Nitro's: `getKey` and `shouldBypassCache` are
 * given h3's event, and read it with h3's helpers or from its context
 * (`tenantCacheKey`).
 */
export function defineCachedRoute<Response>(
  handler: (event: RequestEvent) => Response,
  options: CachedEventHandlerOptions<Response>,
): EventHandler<EventHandlerRequest, Response> {
  const route = defineEventHandler(handler) as unknown as EventHandler<EventHandlerRequest, Response>
  return defineCachedEventHandler(route, options)
}
