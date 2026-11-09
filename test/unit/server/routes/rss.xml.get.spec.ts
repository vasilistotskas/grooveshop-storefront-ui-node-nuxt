import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/rss.xml.get'
import { zBlogCategoryDetail, zBlogPostFeed, zProductCategoryDetail } from '~~/shared/openapi/zod.gen'
import {
  RSS_API as API,
  djangoServesTheCatalogue,
  requestFeed,
  rssSiteConfig as siteConfig,
  rssTenant,
  rssBlogCategory as blogCategory,
  rssOnSale as onSale,
  rssPost as post,
  rssProductCategory as productCategory,
} from '~~/test/fixtures/rssFeed'
import type { BackendRequest } from '~~/test/helpers/nitro'
import { backend, callRoute, jsonResponse, log, setRuntimeConfig } from '~~/test/helpers/nitro'

/**
 * GET /rss.xml: the store's blog-and-products feed. Every link and image
 * in it must point at THIS store's own domains (a second tenant's feed
 * once served its images from the platform host), and every backend
 * call made for it is sent as this store, in the page's language.
 */

const route = '/rss.xml'

const feed = (tenant: Record<string, unknown> = {}, headers?: Record<string, string>) =>
  requestFeed(handler, route, tenant, headers)

describe('GET /rss.xml', () => {
  it('uses fixtures the generated schemas accept', () => {
    expect(zBlogPostFeed.safeParse(post).success).toBe(true)
    expect(zBlogCategoryDetail.safeParse(blogCategory).success).toBe(true)
    expect(zProductCategoryDetail.safeParse(productCategory).success).toBe(true)
  })

  it('serves an RSS document with the store\'s posts and its active products', async () => {
    djangoServesTheCatalogue()

    const response = await feed()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=UTF-8')
    const xml: string = response.body
    expect(xml).toContain('<title><![CDATA[Summer news]]></title>')
    expect(xml).toContain('<link>https://shop.test/blog/post/3/summer-news</link>')
    expect(xml).toContain('<category><![CDATA[Announcements]]></category>')
    expect(xml).toContain('<category><![CDATA[Shoes]]></category>')
    expect(xml).toContain('<readingTime>2 min read</readingTime>')
    expect(xml).toContain(`<content:encoded><![CDATA[${post.translations.en.body}]]></content:encoded>`)
    expect(xml).toContain('<link>https://shop.test/products/1/product-1</link>')
    expect(xml).not.toContain('/products/2/')
  })

  // Django's store purge after an edit names these tags (core/cache/edge.py),
  // so the edge never keeps a feed the purge cannot reach.
  it('is kept at the edge under the store\'s purge tags, and revalidated by browsers', async () => {
    djangoServesTheCatalogue()

    const response = await feed()

    expect(response.headers.get('cache-tag')).toBe(`storefront-html,storefront-html-${rssTenant().schemaName}`)
    expect(response.headers.get('cloudflare-cdn-cache-control')).toBe('max-age=60, stale-while-revalidate=86400')
    expect(response.headers.get('cache-control')).toBe('no-cache')
  })

  it('names itself as its own feed URL', async () => {
    djangoServesTheCatalogue()

    const xml: string = (await feed()).body

    expect(xml).toContain('<atom:link href="https://shop.test/rss.xml" rel="self" type="application/rss+xml"/>')
    expect(xml).toContain('<link>https://shop.test</link>')
  })

  it('syndicates the blog alone, and never asks for products, on a store without the catalogue', async () => {
    djangoServesTheCatalogue()

    const response = await feed({ features: { ...rssTenant().features, catalogue: false } })

    const xml: string = response.body
    expect(xml).toContain('<title><![CDATA[Summer news]]></title>')
    expect(xml).not.toContain('/products/')
    expect(backend.requests.map(request => request.path)).not.toContain(`${API}/product`)
  })

  it('prices products in the store\'s currency with their sale details', async () => {
    djangoServesTheCatalogue()

    const xml: string = (await feed()).body

    expect(xml).toContain('<product:price>110</product:price>')
    expect(xml).toContain('<product:currency>USD</product:currency>')
    expect(xml).toContain('<product:discount>26%</product:discount>')
    expect(xml).toContain('<product:originalPrice>150</product:originalPrice>')
    expect(xml).toContain('<product:availability>in stock</product:availability>')
    expect(xml).toContain('<product:reviewCount>2</product:reviewCount>')
  })

  it('serves images from the store\'s own asset host', async () => {
    setRuntimeConfig({ mediaStreamPath: 'https://assets.platform.test/media_stream-image' })
    djangoServesTheCatalogue()

    const xml: string = (await feed()).body

    expect(xml).toContain('url="https://assets.shop.test/media_stream-image/uploads/products/shoe.png/472/311/cover/attention/transparent/0/100.webp"')
    // The type of what the URL serves (the WebP rendition), not of the upload.
    expect(xml).toContain('type="image/webp"')
    expect(xml).not.toContain('type="image/png"')
    expect(xml).not.toContain('assets.platform.test')
  })

  // A product with no category is a card Django serves as `category: null`.
  it('lists a product without a category and reads no category for it', async () => {
    djangoServesTheCatalogue([{ ...onSale, category: null }])

    const xml: string = (await feed()).body

    expect(xml).toContain('<link>https://shop.test/products/1/product-1</link>')
    expect(xml).not.toContain('<category><![CDATA[Shoes]]></category>')
    expect(backend.requests.some(request => request.path.includes('/product/category/'))).toBe(false)
  })

  // Django sends a Greek filename percent-encoded; encoding it again gave
  // `%25CE…`, a second URL for the same image at the edge.
  it('encodes an already encoded Greek filename once', async () => {
    djangoServesTheCatalogue([{ ...onSale, mainImagePath: 'uploads/products/%CE%BA%CE%BB%CE%B9%CF%80.png' }])

    const xml: string = (await feed()).body

    expect(xml).toContain('url="https://assets.shop.test/media_stream-image/uploads/products/%CE%BA%CE%BB%CE%B9%CF%80.png/472/311/cover/attention/transparent/0/100.webp"')
    expect(xml).not.toContain('%25')
  })

  it('gives a post without an image no image URL', async () => {
    backend.reply((request: BackendRequest) => {
      switch (request.path) {
        case `${API}/blog/post/feed`: return [{ ...post, mainImagePath: '' }]
        case `${API}/product`: return { count: 0, results: [] }
        case `${API}/blog/category/1`: return blogCategory
        default: return jsonResponse({ detail: 'Not found.' }, 404)
      }
    })

    const xml: string = (await feed()).body

    expect(xml).toContain('<title><![CDATA[Summer news]]></title>')
    expect(xml).not.toContain('media_stream-image')
    expect(xml).not.toContain('<media:content')
    expect(xml).not.toContain('<enclosure')
  })

  it('names the store to Django as it was resolved, whatever case or port the Host carries', async () => {
    djangoServesTheCatalogue()

    await callRoute(handler, {
      route,
      host: 'Shop.TEST:443',
      context: { locale: 'en', siteConfig: siteConfig(), tenant: rssTenant() },
    })

    expect(backend.requests.length).toBeGreaterThan(0)
    for (const request of backend.requests) {
      expect(request.headers.get('x-forwarded-host')).toBe('shop.test')
    }
  })

  it('fetches everything as the requesting store, in the page\'s language', async () => {
    djangoServesTheCatalogue()

    await feed({}, { 'x-forwarded-host': 'evil.example' })

    expect(backend.requests.length).toBeGreaterThan(0)
    for (const request of backend.requests) {
      expect(request.headers.get('x-forwarded-host')).toBe('shop.test')
      expect(request.headers.get('x-language')).toBe('en')
    }
  })

  it.each([
    ['the store\'s own logo', { logoLightUrl: 'https://assets.shop.test/logo.png' }, '<url>https://assets.shop.test/logo.png</url>'],
    ['the platform screenshot on the platform storefront', { isPlatformStorefront: true }, '<url>https://shop.test/screenshots/1024x593.png</url>'],
  ])('shows %s as the feed image', async (_label, tenant, image) => {
    djangoServesTheCatalogue()

    expect((await feed(tenant)).body).toContain(image)
  })

  it('shows no feed image for a store without a logo', async () => {
    djangoServesTheCatalogue()

    expect((await feed()).body).not.toContain('<image>')
  })

  it('answers 404 without fetching when the store has no blog', async () => {
    const response = await feed({ blogEnabled: true, features: { ...rssTenant().features, blog: false } })

    expect(response.status).toBe(404)
    expect(backend.requests).toEqual([])
  })

  it('answers a generic 500 and logs when the catalogue cannot be fetched', async () => {
    backend.reply(jsonResponse({ detail: 'boom' }, 502))

    const response = await feed()

    expect(response.status).toBe(500)
    expect(response.body.statusMessage).toBe('Failed to generate RSS feed')
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'rss:generate' }))
  })
})
