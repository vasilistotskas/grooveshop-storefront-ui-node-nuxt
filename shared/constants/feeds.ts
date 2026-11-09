/**
 * The store's RSS feeds and where each is served: `/rss.xml` (blog posts
 * and, with the catalogue, products) and `/blog/rss.xml` (posts only), in
 * the default language; under `/<locale>` in each other language a store
 * serves. Read by `nuxt.config.ts` (the handlers and the route rule),
 * `server/handlers/rss-feed.ts` and the autodiscovery links
 * (`setupPageHeader`).
 */
export const RSS_FEED_PATHS = {
  store: '/rss.xml',
  blog: '/blog/rss.xml',
} as const

export type RssFeedKind = keyof typeof RSS_FEED_PATHS
