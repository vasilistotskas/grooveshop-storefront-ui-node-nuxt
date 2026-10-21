import type { EventHandler, EventHandlerRequest, H3Event } from 'h3'
import { defineCachedEventHandler } from 'nitropack/runtime'
import type { CachedEventHandlerOptions } from 'nitropack/types'
import { defineEventHandler } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * Nitro's cache options, with `shouldBypassCache` written against the
 * portable event like the handler: the question it answers ("is this
 * request one visitor's own?") is answered by the same `nuxt/server`
 * utils the handler uses (the cart session, the allauth session).
 */
export type CachedRouteOptions<Response> = Omit<CachedEventHandlerOptions<Response>, 'shouldBypassCache'> & {
  shouldBypassCache?: (event: RequestEvent) => boolean | Promise<boolean>
}

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
 * The assertions below are that typing gap and nothing else. Nuxt 5 runs
 * Nitro v3, whose h3 v2 event is a `RequestEvent`: this becomes
 * `defineCachedHandler` from `nitro/cache`, with no assertion.
 *
 * `shouldBypassCache` is given the portable event too, through the same
 * bridge. `getKey` stays Nitro's: it is given h3's event, and reads it with
 * h3's helpers or from its context (`tenantCacheKey`).
 */
export function defineCachedRoute<Response>(
  handler: (event: RequestEvent) => Response,
  { shouldBypassCache, ...options }: CachedRouteOptions<Response>,
): EventHandler<EventHandlerRequest, Response> {
  const route = defineEventHandler(handler) as unknown as EventHandler<EventHandlerRequest, Response>
  return defineCachedEventHandler(route, {
    ...options,
    ...(shouldBypassCache && {
      shouldBypassCache: defineEventHandler(shouldBypassCache) as unknown as (event: H3Event) => boolean | Promise<boolean>,
    }),
  })
}
