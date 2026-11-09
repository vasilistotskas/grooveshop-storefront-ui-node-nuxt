import { defineEventHandler } from 'h3'

/**
 * Every feed route: `RSS_FEED_PATHS` under each locale prefix, registered
 * in `nuxt.config.ts` (`nitro.handlers`) as static routes, so no page rule
 * (`/en/blog/**`) or param route can take them first. The path says which
 * feed and which language (`server/utils/rssFeed.ts`).
 */
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0] ?? ''
  const { locale, route } = splitLocale(path)
  const kind: RssFeedKind = route === RSS_FEED_PATHS.blog ? 'blog' : 'store'
  return respondWithRssFeed(event, kind, route === path ? undefined : locale)
})
