import type { H3Event } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * A page the page cache would store is not stored when a builder purge of its
 * store landed while it was rendering (storefront #454).
 *
 * Such a render read the records the purge dropped, and the page it stored
 * after the purge lived for its route's whole `swr` lifetime (300 to 3600 s),
 * then once more while it was re-rendered. The purge moves the store's builder
 * epoch between dropping the data and the pages (`moveBuilderEpoch`); a render
 * reads it as it starts (`render:before`) and again as it answers
 * (`render:response`), and when it moved, answers `no-store`. Nitro's cached
 * handler stores no response that says so (`isCacheableResponse`, nitropack
 * `runtime/internal/cache`), so the purge's deletion stands, and the
 * visitor's answer is private (`server/plugins/edge-cache.ts` keeps it off the
 * edge: only an answer with Nitro's `s-maxage` is stored there).
 *
 * Only a render the page cache runs (Nitro gives its event `context.cache`)
 * reads the epoch: two reads of the shared storage per page-cache miss or
 * revalidation, none on a hit, none for a page that is never cached.
 */
export default defineNitroPlugin((nitroApp) => {
  /** The store and its epoch as each render started, by the render's event. */
  const started = new WeakMap<H3Event, { host: string, epoch: string }>()

  nitroApp.hooks.hook('render:before', async ({ event }) => {
    const host = event.context.tenantHost
    if (!event.context.cache || !host) return
    started.set(event, { host, epoch: await readBuilderEpoch(host) })
  })

  nitroApp.hooks.hook('render:response', async (response, { event }) => {
    const render = started.get(event)
    if (!render) return
    started.delete(event)
    if (await readBuilderEpoch(render.host) === render.epoch) return
    response.headers = { ...response.headers, 'cache-control': 'no-store' }
  })
})
