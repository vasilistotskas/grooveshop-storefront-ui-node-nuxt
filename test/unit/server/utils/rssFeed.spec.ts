import { describe, expect, it } from 'vitest'
import {
  cachedRssBlogCategory,
  cachedRssBlogPosts,
  cachedRssProductCategory,
  generateRssFeed,
} from '~~/server/utils/rssFeed'
import { cacheOptionsOf } from '~~/test/helpers/nitro'

/**
 * The feed's cached reads. Their options are the contract with Django's
 * purge (`sitemap_seo` removes `cache:nitro:functions:rss*`) and with
 * freshness: a stale-serving (`swr`) entry is replayed without an age
 * limit and stored without a TTL, so a feed fell builds behind.
 */
type FeedSource = Parameters<typeof generateRssFeed>[0]

const source: FeedSource = {
  kind: 'blog',
  tenantKey: 'shop.test',
  epoch: '7',
  locale: 'el',
  siteUrl: 'https://shop.test',
  siteName: 'Shop',
  siteDescription: 'A shop',
  baseUrl: 'https://shop.test',
  apiBaseUrl: 'http://backend.test/api/v1',
  mediaStreamPath: 'https://assets.shop.test/media_stream-image',
  currency: 'EUR',
  logoImageUrl: undefined,
  withProducts: false,
}

describe('server/utils/rssFeed cached reads', () => {
  it.each([
    ['rss:blog-category', cachedRssBlogCategory],
    ['rss:blog-posts', cachedRssBlogPosts],
    ['rss:product-category', cachedRssProductCategory],
    ['rss:feed', generateRssFeed],
  ])('%s expires instead of serving stale, under a name Django purges', (name, cached) => {
    expect(cacheOptionsOf(cached)).toMatchObject({ name, swr: false, maxAge: 300 })
  })

  it.each([
    ['rss:blog-category', cachedRssBlogCategory],
    ['rss:blog-posts', cachedRssBlogPosts],
    ['rss:product-category', cachedRssProductCategory],
  ])('%s keys by store, language and url', (_name, cached) => {
    const { getKey } = cacheOptionsOf(cached)
    const key = (host: string, locale: string, url: string) => getKey!(host, locale, url)

    expect(key('shop.test', 'el', '/blog/post/feed')).toBe('shop.test:el:/blog/post/feed')
    expect(new Set([
      key('shop.test', 'el', '/a'),
      key('other.test', 'el', '/a'),
      key('shop.test', 'en', '/a'),
      key('shop.test', 'el', '/b'),
    ]).size).toBe(4)
  })

  it('keys the feed by store, language, kind, catalogue and tenant-config epoch', () => {
    const { getKey } = cacheOptionsOf(generateRssFeed)
    const key = (overrides: Partial<FeedSource>) => getKey!({ ...source, ...overrides })

    expect(key({})).toMatch(/^shop\.test:el:/)
    expect(new Set([
      key({}),
      key({ tenantKey: 'other.test' }),
      key({ locale: 'en' }),
      key({ kind: 'store' }),
      key({ withProducts: true }),
      key({ epoch: '8' }),
    ]).size).toBe(6)
  })
})
