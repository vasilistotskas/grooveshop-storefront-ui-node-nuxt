import type { NavigationMenuItem } from '@nuxt/ui'
import { parsePath } from 'ufo'

interface BottomNavOptions {
  /** The layout drops the cart on account pages. */
  includeCart?: boolean
  /**
   * What a signed-in shopper's Account tab does: open the account sheet.
   * Without it, the tab links to the account page.
   */
  onAccount?: () => void
}

/**
 * The phone tab bar's entries: Home, Search, Saved, Cart and Account.
 *
 * Saved is the shopper's favourite PRODUCTS, the same place the
 * header's heart leads, and it follows the favourites switch. The cart
 * carries its item count. Signed out, Saved and Account lead to the
 * sign-in page with a way back to this one; signed in, Account opens the
 * account sheet when the bar is given one (`onAccount`).
 *
 * Each entry's `active` is decided here from the route name, rather
 * than left to the links: `/` is a prefix of every path, so a prefix
 * match would light Home on every page. The links themselves match
 * exactly, for the same reason, so `aria-current` lands on one tab.
 *
 * The frozen webside tab bar reads `useMobileNavItems`; this is the
 * default tree's own.
 */
export function useBottomNavItems(options: BottomNavOptions = {}) {
  const { includeCart = true, onAccount } = options

  const { $i18n, $routeBaseName } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const route = useRoute()
  const localePath = useLocalePath()
  const { loggedIn } = useUserSession()
  const cartStore = useCartStore()
  const { getCartTotalItems, pending: cartPending } = storeToRefs(cartStore)

  const cartEnabled = useSettingFlag('CART_ENABLED', { fallback: true })
  const favouritesEnabled = useSettingFlag('FAVOURITES_ENABLED', { fallback: true })

  const routeName = computed(() => String($routeBaseName(route) ?? ''))
  const isActive = (...bases: string[]) =>
    bases.some(base => routeName.value === base || routeName.value.startsWith(`${base}-`))

  // The page without its hash: the server never receives one, so a
  // `next` carrying it would differ between the SSR HTML and hydration.
  const signInLink = computed(() => {
    const onSignIn = routeName.value === RedirectToURLs.LOGIN_URL
    const { pathname, search } = parsePath(route.fullPath)
    return localePath({
      name: RedirectToURLs.LOGIN_URL,
      query: onSignIn ? undefined : { next: `${pathname}${search}` },
    })
  })

  const cartCount = computed(() => Number(getCartTotalItems.value) || 0)

  const items = computed<NavigationMenuItem[]>(() => {
    const result: NavigationMenuItem[] = [
      {
        label: t('home'),
        icon: 'i-heroicons-home',
        to: localePath('index'),
        exact: true,
        active: routeName.value === 'index',
      },
      {
        label: t('search.title'),
        icon: 'i-heroicons-magnifying-glass',
        to: localePath('search'),
        exact: true,
        active: isActive('search'),
      },
    ]

    if (favouritesEnabled.value) {
      result.push({
        label: t('saved'),
        icon: 'i-heroicons-heart',
        to: loggedIn.value ? localePath('account-favourites-products') : signInLink.value,
        exact: true,
        active: isActive('account-favourites'),
      })
    }

    if (includeCart && cartEnabled.value) {
      result.push({
        label: t('cart.title'),
        icon: 'i-heroicons-shopping-bag',
        to: localePath('cart'),
        exact: true,
        active: isActive('cart'),
        chip: !cartPending.value && cartCount.value > 0
          ? {
              text: cartCount.value > 99 ? '99+' : cartCount.value,
              color: 'secondary',
              size: '3xl',
            }
          : undefined,
      })
    }

    const accountActive = loggedIn.value && isActive('account') && !isActive('account-favourites')
    result.push(loggedIn.value && onAccount
      ? {
          label: t('account'),
          icon: 'i-heroicons-user',
          active: accountActive,
          onSelect: () => onAccount(),
        }
      : {
          label: t('account'),
          icon: 'i-heroicons-user',
          to: loggedIn.value ? localePath('account') : signInLink.value,
          exact: true,
          active: accountActive,
        })

    return result
  })

  return { items }
}
