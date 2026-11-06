import { splitLocale } from '~~/shared/i18n/localeFromPath'

/**
 * The pages whose address is itself a secret: a key emailed to one person, or
 * an order id that opens a guest order without a login.
 *
 * Every tracker sends the page's address with its hits, and most offer no way
 * to change it. So no tracker runs while one of these is the address
 * (`useTrackingAllowed` in `app/composables/setups.ts`). On 2026-11-06 a
 * password-reset key was seen reaching Google from webside this way.
 *
 * A new page with a secret in its address goes here.
 * `test/unit/source-rules/private-urls.spec.ts` fails for a dynamic page under
 * these sections that is not.
 */
const PRIVATE_URL_PATTERNS: readonly RegExp[] = [
  /^\/account\/password\/reset\/key\/[^/]+$/,
  /^\/account\/verify-email\/[^/]+$/,
  /^\/account\/provider\/callback$/,
  /^\/alerts\/confirm\/[^/]+$/,
  /^\/cart\/recover\/[^/]+$/,
  /^\/checkout\/success\/[^/]+$/,
  /^\/email\/unsubscribe\/[^/]+$/,
  /^\/newsletter\/confirm\/[^/]+$/,
]

/** Whether this address, with or without a locale prefix, holds a secret. */
export function isPrivateUrl(path: string): boolean {
  const { route } = splitLocale(path)
  return PRIVATE_URL_PATTERNS.some(pattern => pattern.test(route))
}
