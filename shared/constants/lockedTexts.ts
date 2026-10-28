/**
 * Texts a store's admin may not replace; only the platform edits them, in
 * code. The catalogue marks an entry `locked` from this list
 * (`modules/text-catalogue`) and `POST /api/texts/validate` refuses it.
 *
 * `namespace` is the catalogue's: `global` for `i18n/locales/**`, else the
 * component's path under `app/` without `.vue`. Every component pattern
 * also matches the same component in a tenant's `variants/<schema>/` tree,
 * because a copy renders the same obligation.
 */
export interface LockedTextRule {
  namespace: RegExp
  key: RegExp
  reason: string
}

const GLOBAL = /^global$/
/** A component path, in the default tree or in any tenant variant tree. */
const component = (path: string) => new RegExp(`^components/(?:variants/[^/]+/)?${path}$`)
const ANY_KEY = /^/

export const LOCKED_TEXTS: readonly LockedTextRule[] = [
  {
    // The label beside the struck-through price names the reference the
    // EU Omnibus rule requires: the lowest price of the 30 days BEFORE the
    // reduction began. Rewording it could misstate that to the shopper.
    namespace: component('Product/PriorPrice'),
    key: ANY_KEY,
    reason: 'EU Omnibus prior-price label',
  },
  {
    // What a shopper agrees to when they accept or decline cookies: the
    // banner, the settings dialog and every category description.
    namespace: component('(?:Cookie/[^/]+|Chrome/CookieConsent)'),
    key: ANY_KEY,
    reason: 'Cookie consent texts',
  },
  {
    // The same obligation in the global locale files (`cookies/*.json`).
    namespace: GLOBAL,
    key: /^cookies\./,
    reason: 'Cookie consent texts',
  },
  {
    // Titles of the four legal pages (terms, privacy, cookies, returns),
    // as the breadcrumb and the footer name them. The pages' own heading is
    // the store's ContentPage and is edited there.
    namespace: GLOBAL,
    key: /^breadcrumb\.items\.(?:terms-of-use|privacy-policy|cookies-policy|return-policy)\.label$/,
    reason: 'Legal page titles',
  },
  {
    namespace: GLOBAL,
    key: /^footer\.(?:terms_conditions|term_of_use|privacy_policy|cookies_policy)$/,
    reason: 'Legal page titles',
  },
  {
    // The legal pages carry their own copy of the breadcrumb titles.
    namespace: component('Storefront/Legal'),
    key: /^breadcrumb\.items\.(?:terms-of-use|privacy-policy|cookies-policy|return-policy)\.label$/,
    reason: 'Legal page titles',
  },
  {
    // The sentence a shopper agrees to when they tick a consent box: the
    // order's terms (checkout), the account's terms (sign-up) and the data
    // processing a contact form asks for. It is the record of what was
    // agreed, so a store may not reword it. The "tick the box" prompts
    // (`consent_required`) are instructions, not consent, and stay open.
    namespace: component('Checkout/TermsConsent'),
    key: ANY_KEY,
    reason: 'Consent wording',
  },
  {
    namespace: component('Account/Signup/Form'),
    key: /^terms\./,
    reason: 'Consent wording',
  },
  {
    namespace: component('ContactForm'),
    key: /^consent$/,
    reason: 'Consent wording',
  },
  {
    namespace: /^components\/PageSection\/variants\/[^/]+\/ContactPanel$/,
    key: /^panel\.consent$/,
    reason: 'Consent wording',
  },
  {
    // `i18n/locales/validation/*.json`: form messages. Django's error
    // contract names these keys, and a vague rewording hides what to fix.
    namespace: GLOBAL,
    key: /^validation\./,
    reason: 'Form validation messages',
  },
  {
    // `errors.codes.<code>`: the text shown for each machine-readable code
    // Django answers with (`app/utils/apiError.ts`). The code is the
    // contract; its text must keep meaning that code.
    namespace: GLOBAL,
    key: /^errors\.codes\./,
    reason: 'API error code texts',
  },
]

/** Whether the platform alone may change the text `key` of `namespace`. */
export function isLockedText(namespace: string, key: string): boolean {
  return LOCKED_TEXTS.some(rule => rule.namespace.test(namespace) && rule.key.test(key))
}
