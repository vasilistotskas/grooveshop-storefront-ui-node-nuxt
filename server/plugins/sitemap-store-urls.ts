import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * The store's own URLs in its sitemap (`storeSitemapUrls`), added as a
 * source by the `sitemap:sources` hook, which runs inside the
 * `/sitemap.xml` request. A source that already holds its `urls` is used
 * as it is: nothing is fetched over HTTP, and the request knows whether
 * every read succeeded. One that failed marks the response
 * (`markSitemapIncomplete`), so no cache keeps a sitemap missing the
 * store's posts, products or pages.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sources', async (ctx) => {
    const event = ctx.event
    if (!event) return
    const { urls, complete } = await storeSitemapUrls(event)
    if (!complete) markSitemapIncomplete(event)
    ctx.sources.push({
      context: { name: 'store', description: 'The store\'s posts, products, categories, content and custom pages.' },
      urls,
    })
  })
})
