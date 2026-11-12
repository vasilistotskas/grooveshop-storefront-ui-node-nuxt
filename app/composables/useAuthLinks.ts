import type { RouteLocationNamedI18n } from 'vue-router'
import { parsePath } from 'ufo'

/**
 * Every link to a sign-in, sign-up or other auth page (the chrome's, the
 * links from one auth form to another, the start-over and back links, the
 * sign-up invitations on the store's pages, in every design), each
 * bringing the shopper back to the page they left: path and query, in the page's language, as the auth
 * middleware does. From a sign-in or sign-up page itself the page is no
 * destination: the link carries on the `next` that page came with, so
 * signing up from `/account/login?next=/cart` still ends on the cart
 * (the flow's completion reads `next` from its own route). Only a path
 * of this store travels on (`safeRelativePath`, the open-redirect guard
 * every reader of `next` uses).
 *
 * Locations, not paths: a `NuxtLinkLocale` adds the language prefix
 * itself, everything else passes them through `localePath`.
 */
export function useAuthLinks() {
  const route = useRoute()
  const { $routeBaseName } = useNuxtApp()

  // Without its hash: the server never receives one, so a `next`
  // carrying it would differ between the SSR HTML and hydration.
  const next = computed(() => {
    if (isAuthFlowRoute(String($routeBaseName(route) ?? ''))) {
      const carried = route.query.next
      return safeRelativePath(typeof carried === 'string' ? carried : undefined)
    }
    const { pathname, search } = parsePath(route.fullPath)
    return `${pathname}${search}`
  })

  /**
   * The auth page `name` with the shopper's destination. Always a location
   * object, never a bare route name: callers read its `query` (`next`)
   * without narrowing. Read it where it is rendered (a template, a click),
   * so it follows the route.
   */
  const authLink = (name: AuthFlowRoute): Exclude<RouteLocationNamedI18n, string> => ({
    name,
    query: next.value ? { next: next.value } : undefined,
  })

  return {
    authLink,
    signIn: computed(() => authLink(RedirectToURLs.LOGIN_URL)),
    signUp: computed(() => authLink('account-signup')),
  }
}
