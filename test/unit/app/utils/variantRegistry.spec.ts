import { describe, expect, it } from 'vitest'
import {
  resolveChrome,
  resolvePage,
  type ChromeKey,
  type PageKey,
} from '~/utils/variantRegistry'

/**
 * webside keeps its own copy of EVERY page body and every piece of
 * chrome. A key missing from the variant map would fall through to the
 * platform default — the redesigned one — on webside.gr, silently.
 */
const PAGE_KEYS: PageKey[] = [
  'home', 'products', 'products-category', 'product', 'search',
  'blog', 'blog-post', 'blog-category', 'blog-author', 'blog-categories',
  'offers', 'gift-cards', 'gift-cards-success', 'loyalty-program',
  'cart', 'checkout', 'checkout-success', 'contact', 'feedback',
  'brand-page', 'legal', 'info', 'custom-page', 'error',
  'login', 'login-code', 'login-code-confirm', 'signup', 'signup-passkey',
  'signup-passkey-create', 'password-reset', 'password-reset-key',
  'verify-email', 'verify-email-key', 'provider-callback', 'provider-signup',
  '2fa-authenticate-totp', '2fa-authenticate-webauthn',
  '2fa-authenticate-recovery-codes',
]

const CHROME_KEYS: ChromeKey[] = ['navbar', 'footer', 'mobile_nav', 'checkout_header']

describe('variantRegistry', () => {
  it.each(PAGE_KEYS)('resolves a webside body for page %s', (key) => {
    const platform = resolvePage(key, 'ekfyseosfyteias')
    const webside = resolvePage(key, 'webside')
    expect(platform).toBeDefined()
    expect(webside).toBeDefined()
    expect(webside).not.toBe(platform)
  })

  it.each(CHROME_KEYS)('resolves webside chrome for %s', (key) => {
    const platform = resolveChrome(key, 'ekfyseosfyteias')
    const webside = resolveChrome(key, 'webside')
    expect(platform).toBeDefined()
    expect(webside).not.toBe(platform)
  })

  it('serves the platform default to a tenant without a variant, and to no tenant at all', () => {
    expect(resolvePage('home', 'demo')).toBe(resolvePage('home', null))
    expect(resolveChrome('navbar', 'demo')).toBe(resolveChrome('navbar', undefined))
  })

  it('keeps the delta_sigma chrome variants', () => {
    expect(resolveChrome('navbar', 'delta_sigma')).not.toBe(resolveChrome('navbar', null))
    expect(resolveChrome('footer', 'delta_sigma')).not.toBe(resolveChrome('footer', null))
    // ...and only those: delta_sigma has no page bodies of its own.
    expect(resolvePage('home', 'delta_sigma')).toBe(resolvePage('home', null))
  })
})
