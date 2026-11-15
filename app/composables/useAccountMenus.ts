/** One entry of webside's account menu, in its own words and icons. */
interface AccountMenuEntry {
  /** The account page it is, in the platform's navigation (`useAccountNavigation`). */
  key: AccountNavKey
  label: string
  /** The page it opens, as the design links it. */
  path: string
  icon: string
}

/**
 * Webside's account menu: its sidebar, its phone menu's account section
 * and its overview's tiles, in its own order, words and icons.
 *
 * What it offers and which entry is current are the platform's account
 * navigation (`useAccountNavigation`), read by key, never decided a
 * second time here: an entry is listed only while that navigation offers
 * its page (the store's features, the page's gate), and it is active,
 * with its `aria-current` (`currentMark`: `page` on its page,
 * `location` on a page under it, an order under Orders), on the same
 * pages as the default design's. Webside's own menu marked only the
 * exact page, so on an order nothing said where the shopper was.
 */
export const useAccountMenus = () => {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const localePath = useLocalePath()
  const route = useRoute()
  const { items: navigation } = useAccountNavigation()

  const blogEnabled = useStoreFeature('blog')

  const entries = computed<AccountMenuEntry[]>(() => [
    { key: 'overview', label: t('account'), path: '/account', icon: 'i-heroicons-user' },
    { key: 'orders', label: t('orders'), path: '/account/orders', icon: 'i-mdi-package-variant-closed' },
    {
      key: 'favourites',
      label: t('favourites'),
      // The posts tab exists only with the blog; without it the
      // favourites live on the products tab.
      path: blogEnabled.value ? '/account/favourites/posts' : '/account/favourites/products',
      icon: 'i-mdi-heart-outline',
    },
    { key: 'notifications', label: t('notifications'), path: '/account/notifications', icon: 'i-heroicons-bell' },
    { key: 'newsletter', label: t('subscriptions'), path: '/account/subscriptions', icon: 'i-heroicons-envelope' },
    { key: 'addresses', label: t('addresses'), path: '/account/addresses', icon: 'i-fa6-solid-address-book' },
    { key: 'rewards', label: t('loyalty'), path: '/account/loyalty', icon: 'i-heroicons-trophy' },
    { key: 'gift_cards', label: t('gift_cards'), path: '/account/gift-cards', icon: 'i-heroicons-gift' },
    { key: 'business', label: t('business_account'), path: '/account/business', icon: 'i-heroicons-briefcase' },
    { key: 'profile', label: t('settings'), path: '/account/settings', icon: 'i-mdi-cog-outline' },
    { key: 'security', label: t('account_nav.security'), path: '/account/security', icon: 'i-heroicons-shield-check' },
    { key: 'reviews', label: t('reviews'), path: '/account/reviews', icon: 'i-mdi-star-outline' },
  ])

  const menus = computed(() => {
    const offered = new Map(navigation.value.map(item => [item.key, item]))
    return entries.value.flatMap(({ key, label, path, icon }) => {
      const page = offered.get(key)
      if (!page) return []
      const to = localePath(pathLocation(path))
      return [{ label, to, icon, 'active': page.active, 'aria-current': currentMark(page.active, to, route.path) }]
    })
  })

  return { menus }
}
