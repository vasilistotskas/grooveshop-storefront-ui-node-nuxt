import type { Component } from 'vue'
import { defineAsyncComponent } from 'vue'

/**
 * Per-tenant CHROME and PAGE-BODY registry.
 *
 * The page builder resolves section variants through `componentRegistry`
 * (`<type>@<schema>` → `<type>` → skipped). Chrome and page bodies are
 * the opposite shape: a default MUST exist, a variant is the exception,
 * and nothing is lazily hydrated (chrome is above the fold on every
 * route; a body IS the page). Same idea, different contract — hence a
 * second registry rather than more entries in the first.
 *
 * Every `app/pages/**.vue` is a thin shell: it keeps only what Nuxt
 * extracts from page files at build time (`definePageMeta`,
 * `defineRouteRules`) and renders `resolvePage(key, schema)`. Everything
 * a visitor sees lives in `app/components/Storefront/` (the platform
 * default) or in `app/components/variants/<schema>/` (a tenant that
 * keeps, or specifies, its own design). Which body a tenant gets is a
 * presentation concern resolved here at runtime; routes, middleware and
 * robots rules never fork.
 *
 * Everything is a lazy chunk: `error.vue` imports this file and is
 * statically imported by nuxt-root, so a static component import here
 * would land in the entry chunk of every page. SSR records the modules a
 * render actually used and emits their `modulepreload`, so the extra
 * hop costs nothing on first paint.
 */

export type ChromeKey = 'navbar' | 'footer' | 'mobile_nav' | 'checkout_header'

export type PageKey
  = | 'home'
    | 'products'
    | 'products-category'
    | 'product'
    | 'search'
    | 'blog'
    | 'blog-post'
    | 'blog-category'
    | 'blog-author'
    | 'blog-categories'
    | 'offers'
    | 'gift-cards'
    | 'gift-cards-success'
    | 'loyalty-program'
    | 'cart'
    | 'checkout'
    | 'checkout-success'
    | 'contact'
    | 'feedback'
    | 'brand-page'
    | 'legal'
    | 'info'
    | 'custom-page'
    | 'error'
    | 'login'
    | 'login-code'
    | 'login-code-confirm'
    | 'signup'
    | 'signup-passkey'
    | 'signup-passkey-create'
    | 'password-reset'
    | 'password-reset-key'
    | 'verify-email'
    | 'verify-email-key'
    | 'provider-callback'
    | 'provider-signup'
    | '2fa-authenticate-totp'
    | '2fa-authenticate-webauthn'
    | '2fa-authenticate-recovery-codes'

type Loader = () => Promise<{ default: Component }>

const lazy = (loader: Loader) => defineAsyncComponent(loader)

const chromeDefaults: Record<ChromeKey, Component> = {
  navbar: lazy(() => import('~/components/Chrome/Navbar.vue')),
  footer: lazy(() => import('~/components/Chrome/Footer.vue')),
  mobile_nav: lazy(() => import('~/components/MobileBottomNav.vue')),
  checkout_header: lazy(() => import('~/components/Chrome/CheckoutHeader.vue')),
}

const pageDefaults: Record<PageKey, Component> = {
  'home': lazy(() => import('~/components/Storefront/Home.vue')),
  'products': lazy(() => import('~/components/Storefront/ProductsIndex.vue')),
  'products-category': lazy(() => import('~/components/Storefront/ProductsCategory.vue')),
  'product': lazy(() => import('~/components/Storefront/ProductDetail.vue')),
  'search': lazy(() => import('~/components/Storefront/Search.vue')),
  'blog': lazy(() => import('~/components/Storefront/BlogIndex.vue')),
  'blog-post': lazy(() => import('~/components/Storefront/BlogPost.vue')),
  'blog-category': lazy(() => import('~/components/Storefront/BlogCategory.vue')),
  'blog-author': lazy(() => import('~/components/Storefront/BlogAuthor.vue')),
  'blog-categories': lazy(() => import('~/components/Storefront/BlogCategories.vue')),
  'offers': lazy(() => import('~/components/Storefront/Offers.vue')),
  'gift-cards': lazy(() => import('~/components/Storefront/GiftCards.vue')),
  'gift-cards-success': lazy(() => import('~/components/Storefront/GiftCardsSuccess.vue')),
  'loyalty-program': lazy(() => import('~/components/Storefront/LoyaltyProgram.vue')),
  'cart': lazy(() => import('~/components/Storefront/Cart.vue')),
  'checkout': lazy(() => import('~/components/Storefront/Checkout.vue')),
  'checkout-success': lazy(() => import('~/components/Storefront/CheckoutSuccess.vue')),
  'contact': lazy(() => import('~/components/Storefront/Contact.vue')),
  'feedback': lazy(() => import('~/components/Storefront/Feedback.vue')),
  'brand-page': lazy(() => import('~/components/Storefront/BrandPage.vue')),
  'legal': lazy(() => import('~/components/Storefront/Legal.vue')),
  'info': lazy(() => import('~/components/Storefront/Info.vue')),
  'custom-page': lazy(() => import('~/components/Storefront/CustomPage.vue')),
  'error': lazy(() => import('~/components/ErrorScreen.vue')),
  'login': lazy(() => import('~/components/Storefront/Auth/Login.vue')),
  'login-code': lazy(() => import('~/components/Storefront/Auth/LoginCode.vue')),
  'login-code-confirm': lazy(() => import('~/components/Storefront/Auth/LoginCodeConfirm.vue')),
  'signup': lazy(() => import('~/components/Storefront/Auth/Signup.vue')),
  'signup-passkey': lazy(() => import('~/components/Storefront/Auth/SignupPasskey.vue')),
  'signup-passkey-create': lazy(() => import('~/components/Storefront/Auth/SignupPasskeyCreate.vue')),
  'password-reset': lazy(() => import('~/components/Storefront/Auth/PasswordReset.vue')),
  'password-reset-key': lazy(() => import('~/components/Storefront/Auth/PasswordResetKey.vue')),
  'verify-email': lazy(() => import('~/components/Storefront/Auth/VerifyEmail.vue')),
  'verify-email-key': lazy(() => import('~/components/Storefront/Auth/VerifyEmailKey.vue')),
  'provider-callback': lazy(() => import('~/components/Storefront/Auth/ProviderCallback.vue')),
  'provider-signup': lazy(() => import('~/components/Storefront/Auth/ProviderSignup.vue')),
  '2fa-authenticate-totp': lazy(() => import('~/components/Storefront/Auth/TwoFactorTotp.vue')),
  '2fa-authenticate-webauthn': lazy(() => import('~/components/Storefront/Auth/TwoFactorWebauthn.vue')),
  '2fa-authenticate-recovery-codes': lazy(() => import('~/components/Storefront/Auth/TwoFactorRecoveryCodes.vue')),
}

/**
 * Tenant variants, keyed `<kind>:<key>@<schema>`. A tenant listed here
 * downloads its own chunk and never the default's; a tenant absent from
 * it never downloads a variant.
 *
 * Δelta Σigma ships its own header and footer: a contractor's site with
 * none of the shop affordances (⌘K search, favourites, account avatar)
 * — see `app/components/Chrome/variants/delta_sigma/`.
 */
const variants: Record<string, Component> = {
  'chrome:navbar@delta_sigma': lazy(() => import('~/components/Chrome/variants/delta_sigma/Navbar.vue')),
  'chrome:footer@delta_sigma': lazy(() => import('~/components/Chrome/variants/delta_sigma/Footer.vue')),
}

/** The tenant's chrome for `key`, or the platform's. Always a component. */
export function resolveChrome(key: ChromeKey, tenantSchema?: string | null): Component {
  return (tenantSchema && variants[`chrome:${key}@${tenantSchema}`]) || chromeDefaults[key]
}

/** The tenant's page body for `key`, or the platform's. Always a component. */
export function resolvePage(key: PageKey, tenantSchema?: string | null): Component {
  return (tenantSchema && variants[`page:${key}@${tenantSchema}`]) || pageDefaults[key]
}

/**
 * Tenants whose page design is a STACK OF FULL-BLEED BANDS rather than
 * cards inside the platform's container.
 *
 * The platform's section shell puts every section inside a `UContainer`
 * with a gap between them, which is right for a shop's homepage and
 * wrong for a design whose bands each own the full width, their own
 * background and a 1px rule against their neighbour: inside that shell
 * the bands would be inset cards with white space between them.
 *
 * A set rather than a component: the difference is the SHELL, not a
 * replacement component, so there is nothing to look up.
 */
const FULL_BLEED_BANDS = new Set(['delta_sigma'])

export function hasFullBleedBands(tenantSchema?: string | null) {
  return !!tenantSchema && FULL_BLEED_BANDS.has(tenantSchema)
}
