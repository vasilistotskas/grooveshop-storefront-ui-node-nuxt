import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/blog/rss.xml.get'
import {
  RSS_API,
  djangoServesTheCatalogue,
  requestFeed,
  rssPost,
  rssTenant,
} from '~~/test/fixtures/rssFeed'
import { backend } from '~~/test/helpers/nitro'

/**
 * GET /blog/rss.xml: the store's blog feed. The same posts as `/rss.xml`,
 * never a product, with each post's cover as its enclosure.
 */

const route = '/blog/rss.xml'

const feed = (tenant: Record<string, unknown> = {}) => requestFeed(handler, route, tenant)

describe('GET /blog/rss.xml', () => {
  it('lists the store\'s posts and never asks Django for products', async () => {
    djangoServesTheCatalogue()

    const response = await feed()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=UTF-8')
    const xml: string = response.body
    expect(xml).toContain('<title><![CDATA[Summer news]]></title>')
    expect(xml).toContain('<link>https://shop.test/blog/post/3/summer-news</link>')
    expect(xml).not.toContain('/products/')
    expect(backend.requests.map(request => request.path)).not.toContain(`${RSS_API}/product`)
  })

  it('carries each post\'s cover as its enclosure, typed as the image it serves', async () => {
    djangoServesTheCatalogue()

    const xml: string = (await feed()).body

    expect(xml).toContain(`<enclosure url="https://assets.shop.test/media_stream-image/${rssPost.mainImagePath}/472/311/cover/attention/transparent/0/100.webp" length="0" type="image/webp"/>`)
  })

  it('names the blog as its channel and itself as its feed URL', async () => {
    djangoServesTheCatalogue()

    const xml: string = (await feed()).body

    expect(xml).toContain('<link>https://shop.test/blog</link>')
    expect(xml).toContain('<atom:link href="https://shop.test/blog/rss.xml" rel="self" type="application/rss+xml"/>')
  })

  it('is kept at the edge under the store\'s purge tags', async () => {
    djangoServesTheCatalogue()

    const response = await feed()

    expect(response.headers.get('cache-tag')).toBe(`storefront-html,storefront-html-${rssTenant().schemaName}`)
  })

  it('answers 404 without fetching when the store has no blog', async () => {
    const response = await feed({ features: { ...rssTenant().features, blog: false } })

    expect(response.status).toBe(404)
    expect(backend.requests).toEqual([])
  })
})
