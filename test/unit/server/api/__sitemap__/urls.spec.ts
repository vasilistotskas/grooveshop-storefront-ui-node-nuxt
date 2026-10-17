/**
 * The dynamic sitemap source. What it must keep true:
 *
 * - a gated surface is left out — blog URLs when the tenant has
 *   `blogEnabled: false`, catalogue URLs when the merchant setting
 *   `CATALOGUE_ENABLED` is off — so the sitemap never advertises a URL
 *   its own route middleware answers with a 404;
 * - it resolves the tenant ITSELF (the route is bypassed in
 *   `0.tenant.ts`) and every backend read names the request's store;
 * - URLs and images point at the tenant's own domains.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/__sitemap__/urls'
import { makeProduct } from '~~/test/fixtures/product'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'
import type { BackendRequest } from '~~/test/helpers/nitro'

const route = '/api/__sitemap__/urls'
const HOST = 'acme.test'
const UPDATED = '2026-01-01T00:00:00Z'

interface Catalogue {
  tenant?: Record<string, unknown> | null
  catalogueEnabled?: string
  posts?: unknown[]
  blogCategories?: unknown[]
  products?: unknown[]
  productCategories?: unknown[]
  contentPages?: unknown[]
  /** Published layouts by page type, or `'down'` for a failed read. */
  layouts?: string[] | 'down'
}

const page = (results: unknown[] = []) => ({ count: results.length, links: { next: null, previous: null }, results })

/** Answer every backend read the route makes, by path. */
function serve(catalogue: Catalogue = {}) {
  const {
    tenant = null,
    catalogueEnabled = 'true',
    posts = [{ id: 1, slug: 'my-post', updatedAt: UPDATED }],
    blogCategories = [{ id: 10, slug: 'tech', updatedAt: UPDATED }],
    products = [makeProduct({ id: 100, slug: 'my-product' })],
    productCategories = [{ id: 200, slug: 'electronics', updatedAt: UPDATED }],
    contentPages = [],
    layouts = [],
  } = catalogue
  backend.reply(({ url }: BackendRequest) => {
    switch (url.pathname.replace('/api/v1', '')) {
      case '/tenant/resolve':
        return tenant ?? jsonResponse({ detail: 'Not found.' }, 404)
      case '/settings/public':
        return { settings: { CATALOGUE_ENABLED: catalogueEnabled } }
      case '/blog/post': return page(posts)
      case '/blog/category': return page(blogCategories)
      case '/product': return page(products)
      case '/product/category': return page(productCategories)
      case '/content-page': return page(contentPages)
      case '/page-config':
        return layouts === 'down'
          ? jsonResponse({ detail: 'upstream down' }, 500)
          : layouts.map(pageType => ({ pageType, lastModified: UPDATED }))
      default: return jsonResponse({ detail: 'Not found.' }, 404)
    }
  })
}

type SitemapUrl = {
  loc: string
  lastmod?: string | Date
  _i18nTransform?: boolean
  images?: Array<{ loc: string, title?: string, caption?: string }>
}

async function sitemap(context: Record<string, unknown> = {}): Promise<SitemapUrl[]> {
  const response = await callRoute(handler, { route, host: HOST, headers: { 'x-forwarded-host': 'evil.example' }, context })
  expect(response.status).toBe(200)
  return response.body
}

const locs = (urls: SitemapUrl[]) => urls.map(url => url.loc)

const tenantContext = (overrides: Record<string, unknown> = {}) => ({ tenant: validTenantConfig(HOST, { blogEnabled: true, ...overrides }) })

describe('server/api/__sitemap__/urls — blog feature gating', () => {
  it('includes blog and catalogue URLs when both are on', async () => {
    serve()

    const urls = locs(await sitemap(tenantContext()))

    expect(urls).toEqual(expect.arrayContaining([
      'https://acme.test/blog/post/1/my-post',
      'https://acme.test/blog/category/10/tech',
      'https://acme.test/products/100/my-product',
      'https://acme.test/products/category/200/electronics',
    ]))
  })

  it('excludes all blog URLs, and never fetches them, when blogEnabled is false', async () => {
    serve()

    const urls = locs(await sitemap(tenantContext({ blogEnabled: false })))

    expect(urls.some(loc => loc.includes('/blog/'))).toBe(false)
    expect(urls).toContain('https://acme.test/products/100/my-product')
    expect(backend.requests.some(request => request.url.pathname.includes('/blog/'))).toBe(false)
  })
})

describe('server/api/__sitemap__/urls — catalogue gating', () => {
  it('reads CATALOGUE_ENABLED from the requesting store', async () => {
    serve()

    await sitemap(tenantContext())

    const settings = backend.requests.find(request => request.url.pathname.endsWith('/settings/public'))
    expect(settings?.headers.get('x-forwarded-host')).toBe(HOST)
  })

  it.each(['false', ''])('excludes product and category URLs when CATALOGUE_ENABLED is %j', async (catalogueEnabled) => {
    serve({ catalogueEnabled })

    const urls = locs(await sitemap(tenantContext()))

    expect(urls.some(loc => loc.includes('/products/'))).toBe(false)
    // The two surfaces are gated independently.
    expect(urls).toContain('https://acme.test/blog/post/1/my-post')
  })

  it('fails closed when the settings endpoint is unreachable', async () => {
    backend.reply(({ url }: BackendRequest) => url.pathname.endsWith('/settings/public')
      ? jsonResponse({ detail: 'down' }, 503)
      : page([makeProduct({ id: 100, slug: 'my-product' })]))

    const urls = locs(await sitemap(tenantContext()))

    expect(urls.some(loc => loc.includes('/products/'))).toBe(false)
  })
})

describe('server/api/__sitemap__/urls — tenant resolution (bypassed route)', () => {
  it('resolves the tenant for the request host when the context has none, honouring its blogEnabled', async () => {
    serve({ tenant: validTenantConfig(HOST, { blogEnabled: false }) })

    const urls = locs(await sitemap())

    const resolve = backend.requests.find(request => request.url.pathname.endsWith('/tenant/resolve'))
    // The Host, never the caller-supplied X-Forwarded-Host.
    expect(resolve?.query).toEqual({ domain: HOST })
    expect(urls.some(loc => loc.includes('/blog/'))).toBe(false)
    expect(urls).toContain('https://acme.test/products/100/my-product')
  })

  it('uses the resolved tenant\'s primary domain for every URL', async () => {
    serve({ tenant: validTenantConfig('www.acme.gr', { blogEnabled: true }) })

    const urls = locs(await sitemap())

    expect(urls).toContain('https://www.acme.gr/products/100/my-product')
    expect(urls.every(loc => loc.startsWith('https://www.acme.gr/'))).toBe(true)
  })

  it('falls back to the request host and an enabled blog when resolution fails', async () => {
    serve({ tenant: null })

    const urls = locs(await sitemap())

    expect(urls).toContain('https://acme.test/blog/post/1/my-post')
  })

  it('sends the request host and locale on every catalogue read, header and query alike', async () => {
    serve()

    await sitemap({ ...tenantContext(), locale: 'en' })

    // The store's settings and layouts are not per language.
    const reads = backend.requests.filter(request =>
      !['/settings/public', '/page-config'].some(path => request.url.pathname.endsWith(path)))
    expect(reads).toHaveLength(5)
    for (const read of reads) {
      expect(read.headers.get('x-forwarded-host')).toBe(HOST)
      expect(read.headers.get('x-language')).toBe('en')
      // The entries are cached under the request locale, so they must be
      // read in it: a hardcoded `el` query put Greek data under `en` keys.
      expect(read.query.languageCode).toBe('en')
    }
  })
})

describe('server/api/__sitemap__/urls — content pages', () => {
  it('lists published content pages under /info/, minus the ones a legal route already serves', async () => {
    // `/info/terms` 301s to `/terms-of-use`; listing it would put a
    // redirect in the sitemap and advertise two addresses for one page.
    serve({
      contentPages: [
        { slug: 'shipping', updatedAt: UPDATED },
        { slug: 'terms', updatedAt: UPDATED },
        { slug: 'privacy', updatedAt: UPDATED },
      ],
    })

    const urls = locs(await sitemap(tenantContext()))

    expect(urls).toContain('https://acme.test/info/shipping')
    expect(urls.some(loc => loc.endsWith('/info/terms') || loc.endsWith('/info/privacy'))).toBe(false)
    const contentRead = backend.requests.find(request => request.url.pathname.endsWith('/content-page'))
    // The endpoint's default page is 12; a store with more would list a subset.
    expect(contentRead?.query.pageSize).toBe('100')
  })
})

describe('server/api/__sitemap__/urls — product images', () => {
  const productWithImage = (translations?: Record<string, unknown>) => makeProduct({
    id: 100,
    slug: 'my-product',
    mainImagePath: 'media/acme/uploads/products/x.jpg',
    ...(translations ? { translations: translations as never } : {}),
  })

  function productImage(urls: SitemapUrl[]) {
    return urls.find(url => url.loc.includes('/products/100/'))?.images?.[0]
  }

  // The full media-stream route, in the catalogue feeds' variant: a URL
  // without the size and format segments is a 404 at the service.
  it('emits image:loc on the tenant\'s own assetsDomain when set', async () => {
    serve({ products: [productWithImage()] })

    const image = productImage(await sitemap(tenantContext({ assetsDomain: 'assets.acme.test' })))

    expect(image?.loc).toBe('https://assets.acme.test/media_stream-image/media/acme/uploads/products/x.jpg/1000/1000/contain/center/FFFFFF/5/85.jpeg')
  })

  it('falls back to the platform media path when the tenant has no assetsDomain', async () => {
    serve({ products: [productWithImage()] })

    const image = productImage(await sitemap(tenantContext({ assetsDomain: '' })))

    expect(image?.loc).toBe('/media_stream-image/media/acme/uploads/products/x.jpg/1000/1000/contain/center/FFFFFF/5/85.jpeg')
  })

  it('titles the image with the Greek name and captions it with the tag-free description, cut to 160 characters', async () => {
    serve({
      products: [productWithImage({
        el: { name: 'Καρέκλα', description: `<p>${'Λ'.repeat(200)}</p>`, seoTitle: '', seoDescription: '', seoKeywords: '' },
      })],
    })

    const image = productImage(await sitemap(tenantContext()))

    expect(image?.title).toBe('Καρέκλα')
    expect(image?.caption).toBe('Λ'.repeat(160))
  })

  it('titles and captions the image in the request locale', async () => {
    serve({
      products: [productWithImage({
        el: { name: 'Καρέκλα', description: '<p>Ξύλινη</p>', seoTitle: '', seoDescription: '', seoKeywords: '' },
        en: { name: 'Chair', description: '<p>Wooden</p>', seoTitle: '', seoDescription: '', seoKeywords: '' },
      })],
    })

    const image = productImage(await sitemap({ ...tenantContext(), locale: 'en' }))

    expect(image?.title).toBe('Chair')
    expect(image?.caption).toBe('Wooden')
  })

  it('captions with the description\'s readable text: tags gone, entities decoded, whitespace collapsed', async () => {
    serve({
      products: [productWithImage({
        el: { name: 'Καρέκλα', description: '<p>Δρυς &amp;\n  <b>καρυδιά</b></p>', seoTitle: '', seoDescription: '', seoKeywords: '' },
      })],
    })

    const image = productImage(await sitemap(tenantContext()))

    expect(image?.caption).toBe('Δρυς & καρυδιά')
  })

  it('falls back to any translated name, and omits an empty caption', async () => {
    serve({
      products: [productWithImage({
        el: { name: '', description: '<p></p>', seoTitle: '', seoDescription: '', seoKeywords: '' },
        en: { name: 'Chair', description: '', seoTitle: '', seoDescription: '', seoKeywords: '' },
      })],
    })

    const image = productImage(await sitemap(tenantContext()))

    expect(image?.title).toBe('Chair')
    expect(image?.caption).toBeUndefined()
  })

  it('emits no image for a product without one', async () => {
    serve()

    const urls = await sitemap(tenantContext())

    expect(urls.find(url => url.loc.includes('/products/100/'))?.images).toBeUndefined()
  })
})

describe('server/api/__sitemap__/urls — custom pages', () => {
  it('lists every published layout no static route renders, at its own path, in every locale', async () => {
    serve({ layouts: ['kelari', 'poies-eimaste'] })

    const urls = await sitemap(tenantContext())

    const custom = urls.filter(url => ['/kelari', '/poies-eimaste'].includes(url.loc))
    expect(custom.map(url => url.loc)).toEqual(['/kelari', '/poies-eimaste'])
    for (const url of custom) {
      expect(url._i18nTransform).toBe(true)
      expect(new Date(url.lastmod!).toISOString()).toBe(new Date(UPDATED).toISOString())
    }
  })

  // Their static routes list them already, and the catch-all refuses
  // them: `/home` was a second homepage on every store.
  it('never lists a page type a static route renders, nor a reserved path', async () => {
    serve({ layouts: ['home', 'about', 'contact', 'offers', 'en', 'kelari'] })

    const urls = locs(await sitemap(tenantContext()))

    expect(urls.filter(loc => loc.startsWith('/'))).toEqual(['/kelari'])
  })

  it('reads the layouts as the requesting store', async () => {
    serve({ layouts: ['kelari'] })

    await sitemap(tenantContext())

    const layouts = backend.requests.find(request => request.url.pathname.endsWith('/page-config'))
    expect(layouts?.headers.get('x-forwarded-host')).toBe(HOST)
  })

  it('reads no layouts without a store', async () => {
    serve({ layouts: ['kelari'] })

    const urls = locs(await sitemap())

    expect(urls).not.toContain('/kelari')
    expect(backend.requests.some(request => request.url.pathname.endsWith('/page-config'))).toBe(false)
  })

  it('lists no custom page when the read fails, and everything else still', async () => {
    serve({ layouts: 'down' })

    const urls = locs(await sitemap(tenantContext()))

    expect(urls.some(loc => loc.startsWith('/'))).toBe(false)
    expect(urls).toContain('https://acme.test/blog/post/1/my-post')
  })
})
