// The router is an h3 v1 handler Nitro mounts, so the layer wrapping it
// is built with h3's own helper, as `1.device-class.ts` does.
import { defineEventHandler } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Runs `stripTrackingParamsFromCachedRoute` between the last middleware
 * and Nitro's router, which is where the page cache sits.
 *
 * It cannot be a middleware or a `request` hook: h3 hands every layer the
 * path it captured when the request arrived, so a rewrite made in one is
 * undone before the next layer runs (verified: a middleware's `req.url`
 * is the original again in the layer after it). The router is the one
 * layer that follows every middleware, so it is wrapped instead — and its
 * absence is an error, not a silent skip: a Nitro that mounts it
 * differently would otherwise bring the cache misses back unnoticed.
 *
 * Nuxt 5 moves to Nitro v3, where a cache rule's `allowQuery` makes this
 * a route-rule option; this plugin goes with the upgrade.
 */
export default defineNitroPlugin((nitroApp) => {
  const layer = nitroApp.h3App.stack.find(({ handler }) => handler === nitroApp.router.handler)
  if (!layer) {
    throw new Error('tracking-params: Nitro\'s router is not mounted on the h3 app, so the page cache cannot be keyed without ad tags')
  }

  const route = layer.handler
  layer.handler = defineEventHandler((event) => {
    stripTrackingParamsFromCachedRoute(event)
    return route(event)
  })
})
