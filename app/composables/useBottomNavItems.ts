import type { NavigationMenuItem } from '@nuxt/ui'
import { parsePath } from 'ufo'

/** A tab the bar can carry; a design picks its own, in its own order. */
export type BottomNavTab = 'home' | 'search' | 'saved' | 'shop' | 'blog' | 'cart' | 'account'

/** The default design's tabs. */
const DEFAULT_TABS: readonly BottomNavTab[] = ['home', 'search', 'saved', 'cart', 'account']

const DEFAULT_ICONS: Readonly<Record<BottomNavTab, string>> = {
  home: 'i-heroicons-home',
  search: 'i-heroicons-magnifying-glass',
  saved: 'i-heroicons-heart',
  shop: 'i-heroicons-building-storefront',
  blog: 'i-heroicons-newspaper',
  cart: 'i-heroicons-shopping-bag',
  account: 'i-heroicons-user',
}

interface BottomNavOptions {
  /** The tabs the design's bar carries, in order; each still follows its store feature. */
  tabs?: readonly BottomNavTab[]
  /** The design's own icon for a tab, where it differs from the default one. */
  icons?: Partial<Record<BottomNavTab, string>>
  /** Whether a signed-in shopper's Account tab shows their photo, when they have one. */
  accountAvatar?: boolean
  /** The layout drops the cart on account pages. */
  includeCart?: boolean
  /**
   * What a signed-in shopper's Account tab does: open the account sheet.
   * Without it, the tab links to the account page.
   */
  onAccount?: () => void
}

/**
 * The phone tab bar's entries, for every design: the default's Home,
 * Search, Saved, Cart and Account, or the tabs a design asks for (webside:
 * Home, Shop, Blog, Cart, Account).
 *
 * Each tab follows the store feature of the page it opens: Saved the
 * favourites, Shop the catalogue, Blog the blog, Cart the cart. Saved is
 * the shopper's favourite PRODUCTS, the same place the header's heart
 * leads. The cart carries its item count. Signed out, Saved and Account
 * lead to the sign-in page with a way back to this one; signed in,
 * Account opens the account sheet when the bar is given one (`onAccount`).
 *
 * Each entry's `active` is decided here from the route name, rather
 * than left to the links: `/` is a prefix of every path, so a prefix
 * match would light Home on every page. The links themselves match
 * exactly, for the same reason, so `aria-current` lands on one tab.
 */
export function useBottomNavItems(options: BottomNavOptions = {}) {
  const { tabs = DEFAULT_TABS, icons = {}, accountAvatar = false, includeCart = true, onAccount } = options

  const { $i18n, $routeBaseName } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const route = useRoute()
  const localePath = useLocalePath()
  const { loggedIn, user } = useUserSession()
  const cartStore = useCartStore()
  const { getCartTotalItems, pending: cartPending } = storeToRefs(cartStore)
  const img = useMediaStreamImage()

  const cartEnabled = useStoreFeature('cart')
  const favouritesEnabled = useStoreFeature('favourites')
  const catalogueEnabled = useStoreFeature('catalogue')
  const blogEnabled = useStoreFeature('blog')

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

  const avatarSrc = computed(() => {
    const path = accountAvatar && loggedIn.value ? user.value?.mainImagePath : undefined
    return path ? img(path, { width: 32, height: 32, fit: 'cover' }, { provider: 'mediaStream' }) : undefined
  })

  const icon = (tab: BottomNavTab) => icons[tab] ?? DEFAULT_ICONS[tab]

  const entry = (tab: BottomNavTab): NavigationMenuItem | undefined => {
    switch (tab) {
      case 'home':
        return { label: t('home'), icon: icon(tab), to: localePath('index'), exact: true, active: routeName.value === 'index' }
      case 'search':
        return { label: t('search.title'), icon: icon(tab), to: localePath('search'), exact: true, active: isActive('search') }
      case 'saved':
        if (!favouritesEnabled.value) return undefined
        return {
          label: t('saved'),
          icon: icon(tab),
          to: loggedIn.value ? localePath('account-favourites-products') : signInLink.value,
          exact: true,
          active: isActive('account-favourites'),
        }
      case 'shop':
        if (!catalogueEnabled.value) return undefined
        return { label: t('shop'), icon: icon(tab), to: localePath('products'), exact: true, active: isActive('products') }
      case 'blog':
        if (!blogEnabled.value) return undefined
        return { label: t('blog'), icon: icon(tab), to: localePath('blog'), exact: true, active: isActive('blog') }
      case 'cart':
        if (!includeCart || !cartEnabled.value) return undefined
        return {
          label: t('cart.title'),
          icon: icon(tab),
          to: localePath('cart'),
          exact: true,
          active: isActive('cart'),
          chip: !cartPending.value && cartCount.value > 0
            ? {
                text: cartCount.value > 99 ? '99+' : cartCount.value,
                color: 'secondary',
                size: '3xl',
                // On the icon's corner, not inside it: NavigationMenu
                // insets the chip by default, and at this size it covered
                // the bag (owner review, 2026-10-16).
                inset: false,
              }
            : undefined,
        }
      case 'account': {
        const active = loggedIn.value && isActive('account') && !isActive('account-favourites')
        const look = avatarSrc.value ? { avatar: { src: avatarSrc.value, alt: '' } } : { icon: icon(tab) }
        if (loggedIn.value && onAccount) {
          return { label: t('account'), ...look, active, onSelect: () => onAccount() }
        }
        return {
          label: t('account'),
          ...look,
          to: loggedIn.value ? localePath('account') : signInLink.value,
          exact: true,
          active,
        }
      }
    }
  }

  const items = computed<NavigationMenuItem[]>(() =>
    tabs.map(entry).filter((item): item is NavigationMenuItem => item !== undefined),
  )

  return { items }
}
