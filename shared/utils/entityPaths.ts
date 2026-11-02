import { LEGAL_ROUTE_BY_SLUG } from './legalPages.ts'
import { STATIC_LAYOUT_ROUTES, isStaticLayoutPageType } from './staticLayoutRoutes.ts'

/**
 * Where a record of the store is served, before the locale prefix: the one
 * place that writes these routes. The address a page links to a record and
 * the address a link of the page builder resolves to both come from here,
 * so a route that moves is changed once.
 */

export const productPath = (id: number, slug: string): string => `/products/${id}/${slug}`

export const categoryPath = (id: number, slug: string): string => `/products/category/${id}/${slug}`

export const blogPostPath = (id: number, slug: string): string => `/blog/post/${id}/${slug}`

export const blogCategoryPath = (id: number, slug: string): string => `/blog/category/${id}/${slug}`

/**
 * A page of the store by its page type. A page type a static route renders is
 * served at that route (`home` at `/`, not `/home`, which only redirects);
 * any other is a custom page at `/<pageType>`.
 */
export const pagePath = (pageType: string): string =>
  isStaticLayoutPageType(pageType) ? STATIC_LAYOUT_ROUTES[pageType].path : `/${pageType}`

/**
 * A content page by slug. A legal page is served at its own route
 * (`LEGAL_ROUTE_BY_SLUG`) rather than at `/info/<slug>`, which would 301 to it.
 */
export const contentPagePath = (slug: string): string => LEGAL_ROUTE_BY_SLUG.get(slug) ?? `/info/${slug}`
