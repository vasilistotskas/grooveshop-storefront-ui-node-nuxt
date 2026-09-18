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

  // webside: today's platform storefront, frozen byte-for-byte under
  // app/components/variants/webside/ while the defaults are redesigned.
  // Every page body and every piece of chrome — a key missing here
  // would hand webside the redesign (test/unit/variants/variant-registry.spec.ts).
  'chrome:navbar@webside': lazy(() => import('~/components/variants/webside/Chrome/Navbar.vue')),
  'chrome:footer@webside': lazy(() => import('~/components/variants/webside/Chrome/Footer.vue')),
  'chrome:mobile_nav@webside': lazy(() => import('~/components/variants/webside/MobileBottomNav.vue')),
  'chrome:checkout_header@webside': lazy(() => import('~/components/variants/webside/Chrome/CheckoutHeader.vue')),
  'page:home@webside': lazy(() => import('~/components/variants/webside/Storefront/Home.vue')),
  'page:products@webside': lazy(() => import('~/components/variants/webside/Storefront/ProductsIndex.vue')),
  'page:products-category@webside': lazy(() => import('~/components/variants/webside/Storefront/ProductsCategory.vue')),
  'page:product@webside': lazy(() => import('~/components/variants/webside/Storefront/ProductDetail.vue')),
  'page:search@webside': lazy(() => import('~/components/variants/webside/Storefront/Search.vue')),
  'page:blog@webside': lazy(() => import('~/components/variants/webside/Storefront/BlogIndex.vue')),
  'page:blog-post@webside': lazy(() => import('~/components/variants/webside/Storefront/BlogPost.vue')),
  'page:blog-category@webside': lazy(() => import('~/components/variants/webside/Storefront/BlogCategory.vue')),
  'page:blog-author@webside': lazy(() => import('~/components/variants/webside/Storefront/BlogAuthor.vue')),
  'page:blog-categories@webside': lazy(() => import('~/components/variants/webside/Storefront/BlogCategories.vue')),
  'page:offers@webside': lazy(() => import('~/components/variants/webside/Storefront/Offers.vue')),
  'page:gift-cards@webside': lazy(() => import('~/components/variants/webside/Storefront/GiftCards.vue')),
  'page:gift-cards-success@webside': lazy(() => import('~/components/variants/webside/Storefront/GiftCardsSuccess.vue')),
  'page:loyalty-program@webside': lazy(() => import('~/components/variants/webside/Storefront/LoyaltyProgram.vue')),
  'page:cart@webside': lazy(() => import('~/components/variants/webside/Storefront/Cart.vue')),
  'page:checkout@webside': lazy(() => import('~/components/variants/webside/Storefront/Checkout.vue')),
  'page:checkout-success@webside': lazy(() => import('~/components/variants/webside/Storefront/CheckoutSuccess.vue')),
  'page:contact@webside': lazy(() => import('~/components/variants/webside/Storefront/Contact.vue')),
  'page:feedback@webside': lazy(() => import('~/components/variants/webside/Storefront/Feedback.vue')),
  'page:brand-page@webside': lazy(() => import('~/components/variants/webside/Storefront/BrandPage.vue')),
  'page:legal@webside': lazy(() => import('~/components/variants/webside/Storefront/Legal.vue')),
  'page:info@webside': lazy(() => import('~/components/variants/webside/Storefront/Info.vue')),
  'page:custom-page@webside': lazy(() => import('~/components/variants/webside/Storefront/CustomPage.vue')),
  'page:error@webside': lazy(() => import('~/components/variants/webside/ErrorScreen.vue')),
  'page:login@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/Login.vue')),
  'page:login-code@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/LoginCode.vue')),
  'page:login-code-confirm@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/LoginCodeConfirm.vue')),
  'page:signup@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/Signup.vue')),
  'page:signup-passkey@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/SignupPasskey.vue')),
  'page:signup-passkey-create@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/SignupPasskeyCreate.vue')),
  'page:password-reset@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/PasswordReset.vue')),
  'page:password-reset-key@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/PasswordResetKey.vue')),
  'page:verify-email@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/VerifyEmail.vue')),
  'page:verify-email-key@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/VerifyEmailKey.vue')),
  'page:provider-callback@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/ProviderCallback.vue')),
  'page:provider-signup@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/ProviderSignup.vue')),
  'page:2fa-authenticate-totp@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/TwoFactorTotp.vue')),
  'page:2fa-authenticate-webauthn@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/TwoFactorWebauthn.vue')),
  'page:2fa-authenticate-recovery-codes@webside': lazy(() => import('~/components/variants/webside/Storefront/Auth/TwoFactorRecoveryCodes.vue')),
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
 * cards inside a container.
 *
 * ONLY THE FROZEN `webside` TREE STILL ASKS. The platform default is now
 * a stack of bands itself — each section owns its width, its ground and
 * its own container (`PageSection/Band.vue`) — so for everything outside
 * `app/components/variants/webside/**` the answer is always "yes" and
 * the question is not worth asking. webside keeps the previous shell, a
 * `PageWrapper` with a gap between inset cards, and its frozen copies of
 * the shell and the contact body read this to choose it.
 *
 * So: do not call this from new code, and do not add a schema to the
 * set. A tenant that wants a different page frame registers
 * `page:<key>@<schema>` like any other variant.
 */
const FULL_BLEED_BANDS = new Set(['delta_sigma'])

export function hasFullBleedBands(tenantSchema?: string | null) {
  return !!tenantSchema && FULL_BLEED_BANDS.has(tenantSchema)
}
