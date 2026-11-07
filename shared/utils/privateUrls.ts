import { splitLocale } from '~~/shared/i18n/localeFromPath'

/**
 * The addresses that hold a secret: a key emailed to one person, or an order id
 * that opens a guest order without a login.
 *
 * Every tracker sends the page's address with its hits, and most offer no way
 * to change it. So no tracker runs while one of these is the address
 * (`useTrackingAllowed` in `app/composables/setups.ts`). On 2026-11-06 a
 * password-reset key was seen reaching Google from webside this way.
 *
 * A new page with a secret in its path or query goes here.
 * `test/unit/source-rules/private-urls.spec.ts` fails for a dynamic page named
 * as one that is not.
 */
const PRIVATE_PATHS: readonly RegExp[] = [
  /^\/account\/password\/reset\/key\/[^/]+$/,
  /^\/account\/verify-email\/[^/]+$/,
  /^\/account\/provider\/callback$/,
  /^\/alerts\/confirm\/[^/]+$/,
  /^\/cart\/recover\/[^/]+$/,
  /^\/checkout\/success\/[^/]+$/,
  /^\/email\/unsubscribe\/[^/]+$/,
  /^\/newsletter\/confirm\/[^/]+$/,
]

/** Query parameters holding the address to go to next, as login's do. */
const NEXT_ADDRESS_PARAMS: readonly string[] = ['next', 'redirect']

/** Whether this address (path and query, any locale) holds a secret. */
export function isPrivateUrl(url: string): boolean {
  const queryAt = url.indexOf('?')
  const path = queryAt === -1 ? url : url.slice(0, queryAt)
  const { route } = splitLocale(path)
  if (PRIVATE_PATHS.some(pattern => pattern.test(route))) return true
  if (queryAt === -1) return false
  const query = new URLSearchParams(url.slice(queryAt + 1))
  return NEXT_ADDRESS_PARAMS.some((name) => {
    const next = query.get(name)
    return next !== null && isPrivateUrl(next)
  })
}
