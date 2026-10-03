import { describe, expect, it } from 'vitest'
import {
  resolveChrome,
  resolveDesign,
  resolveLayout,
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
  '2fa-authenticate-recovery-codes', 'newsletter-confirm',
  'account', 'account-2fa', 'account-2fa-recovery-codes-generate',
  'account-2fa-recovery-codes', 'account-2fa-totp-activate',
  'account-2fa-totp-deactivate', 'account-2fa-webauthn-add', 'account-2fa-webauthn',
  'account-addresses-id-edit', 'account-addresses', 'account-addresses-new',
  'account-business', 'account-email', 'account-favourites-posts',
  'account-favourites-products', 'account-gift-cards', 'account-loyalty',
  'account-notifications', 'account-orders-id', 'account-orders',
  'account-password-change', 'account-providers', 'account-reviews',
  'account-sessions', 'account-settings', 'account-settings-privacy',
  'account-subscriptions', 'reauthenticate', '2fa-reauthenticate-totp',
  '2fa-reauthenticate-webauthn', '2fa-reauthenticate-recovery-codes',
]

// Every chrome key, exhaustively: `satisfies Record<ChromeKey, true>` fails
// the typecheck the day a key is added here-less, so a new slot cannot
// ship without its webside entry being checked.
const CHROME_KEYS = Object.keys({
  navbar: true,
  footer: true,
  mobile_nav: true,
  checkout_header: true,
  account_shell: true,
  cookie_consent: true,
} satisfies Record<ChromeKey, true>) as ChromeKey[]

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

  it('draws every tenant in the Volt design except the frozen webside', () => {
    expect(resolveDesign('demo')).toBe('volt')
    expect(resolveDesign('ekfyseosfyteias')).toBe('volt')
    expect(resolveDesign('delta_sigma')).toBe('volt')
    // webside renders with the base stylesheet and app config, which is
    // what its frozen tree was captured against.
    expect(resolveDesign('webside')).toBeNull()
  })

  it('frames the sign-in pages in the split layout for Volt tenants only', () => {
    expect(resolveLayout('auth', 'demo')).toBe('auth-split')
    expect(resolveLayout('auth', 'ekfyseosfyteias')).toBe('auth-split')
    // webside and a request without a tenant keep the layout their page
    // declares: the frozen sign-in pages were captured inside it.
    expect(resolveLayout('auth', 'webside')).toBeNull()
    expect(resolveLayout('auth', null)).toBeNull()
  })

  it('leaves a request without a tenant on the base design', () => {
    expect(resolveDesign(null)).toBeNull()
    expect(resolveDesign(undefined)).toBeNull()
    expect(resolveDesign('')).toBeNull()
  })

  it('keeps the delta_sigma chrome variants', () => {
    expect(resolveChrome('navbar', 'delta_sigma')).not.toBe(resolveChrome('navbar', null))
    expect(resolveChrome('footer', 'delta_sigma')).not.toBe(resolveChrome('footer', null))
    // ...and only those: delta_sigma has no page bodies of its own.
    expect(resolvePage('home', 'delta_sigma')).toBe(resolvePage('home', null))
  })
})
