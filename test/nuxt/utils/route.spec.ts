import { describe, it, expect } from 'vitest'

/**
 * Two route facts that code without a router relies on, checked against the
 * app's real router: the sign-in, sign-up and re-authentication pages'
 * paths (`isAuthPagePath`, the `next` guard's way to tell one), and which
 * pages keep their query when a sign-in brings the shopper back
 * (`signInReturn` in their `definePageMeta`, read by `returnTarget`).
 */

/** A route's path with its params filled, in the default language and in English. */
function pathsOf(name: string): string[] {
  const route = useRouter().getRoutes().find(record => record.name === `${name}___el`)
  if (!route) throw new Error(`no route ${name}`)
  const path = route.path.replace(/:[^/()]+(\([^)]*\))?\??/g, 'k3y')
  return [path, `/en${path}`]
}

describe('isAuthPagePath', () => {
  it.each([...AuthFlowRoutes, ...ReauthenticateRoutes])('knows %s by its path', (name) => {
    for (const path of pathsOf(name)) expect(isAuthPagePath(path), path).toBe(true)
  })

  it.each([
    'index', 'products', 'cart', 'checkout', 'account', 'account-orders', 'account-providers', 'account-security',
  ])('does not take %s for one', (name) => {
    for (const path of pathsOf(name)) expect(isAuthPagePath(path), path).toBe(false)
  })
})

describe('the pages a sign-in brings back to with their query', () => {
  const target = (url: string) => returnTarget(useRouter().resolve(url))

  // Their query is the view: the listing's sort, filters and page, a search,
  // the blog's topic and page.
  it.each([
    '/products?sort=-createdAt&inStock=true&page=2',
    '/products/category/1/charging?sort=effectivePrice&brand=3',
    '/search?q=cable',
    '/blog?category=7&page=2',
    '/blog/category/7/mobile?page=2',
    '/blog/author/3?page=2',
  ])('keeps %s', (url) => {
    expect(target(url)).toBe(url)
  })

  // Their query holds a payment session, an order code, a purchase, a
  // provider's answer or nothing worth keeping: only the path travels.
  it.each([
    ['/checkout/success/0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10?session_id=cs_live_secret&s=1234567890123456&placed=1', '/checkout/success/0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10'],
    ['/gift-cards/success?purchase=0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10', '/gift-cards/success'],
    ['/checkout?canceled=1', '/checkout'],
    ['/cart?paymentError=declined', '/cart'],
    ['/products/42/pot?variant=3', '/products/42/pot'],
  ])('carries only the path of %s', (url, path) => {
    expect(target(url)).toBe(path)
  })

  // Their path is a one-time token: no sign-in page's address carries it.
  it.each([
    '/email/unsubscribe/tok3n',
    '/newsletter/confirm/tok3n',
    '/alerts/confirm/tok3n',
    '/_builder/preview/tok3n',
  ])('carries nothing from %s', (url) => {
    expect(target(url)).toBeUndefined()
  })
})
