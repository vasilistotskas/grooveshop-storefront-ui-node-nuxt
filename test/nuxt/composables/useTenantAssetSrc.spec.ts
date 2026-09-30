/**
 * Only the store's OWN origin may be stripped: that turns its logo back
 * into a public-dir path @nuxt/image can optimise. Any other host — the
 * assets domain, another store, a CDN — must pass through, or the image
 * would be requested from this store's origin and 404.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setTenant } from '~~/test/helpers/tenant'

describe('useTenantAssetSrc', () => {
  beforeEach(() => {
    setTenant({ primaryDomain: 'shop.test', assetsDomain: 'assets.shop.test' })
  })

  it.each([
    ['the store\'s primary domain, keeping the query', 'https://shop.test/uploads/logo.png?v=2', '/uploads/logo.png?v=2'],
    ['the host the page was requested on', () => `${useRequestURL().origin}/uploads/banner.jpg`, '/uploads/banner.jpg'],
  ])('relativises a URL on %s', (_case, src, expected) => {
    const input = typeof src === 'function' ? src() : src

    expect(useTenantAssetSrc().relativize(input)).toBe(expected)
  })

  it.each([
    ['the store\'s assets domain', 'https://assets.shop.test/media/x.jpg'],
    ['another store', 'https://other-store.test/uploads/logo.png'],
    ['a subdomain-lookalike of the store', 'https://shop.test.evil.test/logo.png'],
    ['a protocol-relative external URL', '//cdn.test/logo.png'],
  ])('leaves a URL on %s untouched', (_case, src) => {
    expect(useTenantAssetSrc().relativize(src)).toBe(src)
  })

  it.each([
    ['empty', ''],
    ['already relative', '/img/logo.png'],
  ])('returns an %s src as given', (_case, src) => {
    expect(useTenantAssetSrc().relativize(src)).toBe(src)
  })
})
