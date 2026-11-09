import { createSiteConfigStack } from 'site-config-stack'
import { makeProductCard } from '~~/test/fixtures/product'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import type { BackendRequest } from '~~/test/helpers/nitro'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

/**
 * What the RSS feeds (`server/utils/rssFeed.ts`) are built from: Django's
 * answers for one store, and a request for a feed route as that store.
 * The specs of `/rss.xml` and `/blog/rss.xml` share them.
 */

export const RSS_API = 'http://backend.test/api/v1'
const TIMESTAMP = '2026-01-01T00:00:00Z'

export const rssPost = {
  id: 3,
  uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  slug: 'summer-news',
  translations: { en: { title: 'Summer news', subtitle: 'What is new', body: 'word '.repeat(400) } },
  category: 1,
  publishedAt: '2026-06-01T00:00:00Z',
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  mainImagePath: 'uploads/blog/summer.jpg',
}

export const rssBlogCategory = {
  id: 1,
  translations: { en: { name: 'Announcements' } },
  slug: 'announcements',
  level: 0,
  sortOrder: null,
  postCount: 1,
  hasChildren: false,
  mainImagePath: '',
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  children: [],
  ancestors: [],
  siblingsCount: 0,
  descendantsCount: 0,
  recursivePostCount: 1,
  categoryPath: 'announcements',
  treeId: 1,
  uuid: '6a2f41a3-c54c-4fce-8e63-4a7a3b1c5a4e',
}

export const rssProductCategory = {
  id: 1,
  translations: { en: { name: 'Shoes' } },
  slug: 'shoes',
  level: 0,
  treeId: 1,
  mainImagePath: '',
  mainImageAlt: '',
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  uuid: '0b4f4c8e-7f2d-4d0a-9c1e-5b6a7d8e9f00',
  children: [],
  recursiveProductCount: 1,
}

export const rssOnSale = makeProductCard({ id: 1, finalPrice: 110, effectivePrice: 110, priorPrice: 150, announcedDiscountPercent: 26, mainImagePath: 'uploads/products/shoe.png', reviewCount: 2, reviewAverage: 4.5 })
export const rssRetired = makeProductCard({ id: 2, active: false })

/** Django: one blog post, two products (one retired) and their categories. */
export function djangoServesTheCatalogue(products = [rssOnSale, rssRetired]) {
  backend.reply((request: BackendRequest) => {
    switch (request.path) {
      // The feed: the posts with their bodies, which a list no longer carries
      case `${RSS_API}/blog/post/feed`: return [rssPost]
      case `${RSS_API}/product`: return { count: products.length, results: products }
      case `${RSS_API}/blog/category/1`: return rssBlogCategory
      case `${RSS_API}/product/category/1`: return rssProductCategory
      default: return jsonResponse({ detail: 'Not found.' }, 404)
    }
  })
}

export function rssSiteConfig() {
  const stack = createSiteConfigStack()
  stack.push({ url: 'https://shop.test', name: 'Shop', description: 'A shop' })
  return stack
}

/** A store with its blog on, in English, pricing in dollars, with its own asset host. */
export function rssTenant(overrides: Record<string, unknown> = {}) {
  return validTenantConfig('shop.test', {
    features: { ...validTenantConfig('shop.test').features, blog: true },
    defaultCurrency: 'USD',
    assetsDomain: 'assets.shop.test',
    ...overrides,
  })
}

/** Request a feed route as that store. */
export function requestFeed(
  handler: Parameters<typeof callRoute>[0],
  route: string,
  tenant: Record<string, unknown> = {},
  headers?: Record<string, string>,
) {
  return callRoute(handler, {
    route,
    headers,
    context: { locale: 'en', siteConfig: rssSiteConfig(), tenant: rssTenant(tenant) },
  })
}
