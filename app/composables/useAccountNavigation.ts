import type { RouteMapI18n } from 'vue-router'

export type AccountNavKey
  = | 'overview' | 'orders' | 'addresses' | 'favourites' | 'reviews'
    | 'notifications' | 'rewards' | 'gift_cards' | 'business' | 'newsletter'
    | 'profile' | 'security' | 'privacy'

export interface AccountNavItem {
  key: AccountNavKey
  label: string
  icon: string
  to: string
  /** This item's page, or one of the pages under it, is on screen. */
  active: boolean
  /** A count to show beside the label (unseen notifications). */
  badge?: number
}

interface AccountNavEntry {
  key: AccountNavKey
  icon: string
  route: keyof RouteMapI18n
  /** Route base names this entry is active for, besides its own. */
  owns?: (name: string) => boolean
}

/**
 * The signed-in account area's navigation, in the boards' order: the
 * shell's sidebar on desktop and the overview's tiles on a phone.
 *
 * Each entry is offered only while its page serves: the same plan flag
 * and merchant switch its route middleware checks (and that the frozen
 * webside menu, `useAccountMenus`, keeps checking for its own tree), so
 * the navigation never advertises a dead page.
 *
 * An entry stays active on the pages under it — an order on Orders, an
 * address form on Addresses, the email, password, connected-account,
 * session and two-step pages on Security.
 */
export function useAccountNavigation() {
  const { $i18n, $routeBaseName } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const localePath = useLocalePath()
  const route = useRoute()
  const tenantStore = useTenantStore()

  const { data: loyaltySettings } = useLoyalty().fetchSettings()
  const reviewsEnabled = useSettingFlag('ACCOUNT_REVIEWS_ENABLED', { fallback: true })
  const favouritesEnabled = useSettingFlag('FAVOURITES_ENABLED', { fallback: true })
  const newsletterEnabled = useSettingFlag('NEWSLETTER_ENABLED', { fallback: true })
  const giftCardsEnabled = useSettingFlag('GIFT_CARDS_ENABLED', { fallback: false })
  const b2bEnabled = useSettingFlag('B2B_WHOLESALE_ENABLED', { fallback: false })
  const { count: unseenNotifications } = useUnseenNotificationsCount()

  const under = (prefix: string) => (name: string) => name === prefix || name.startsWith(`${prefix}-`)
  const SIGN_IN_PAGES = new Set(['account-email', 'account-password-change', 'account-providers', 'account-sessions'])

  const entries = computed<AccountNavEntry[]>(() => [
    { key: 'overview', icon: 'i-lucide-house', route: 'account' },
    { key: 'orders', icon: 'i-lucide-shopping-bag', route: 'account-orders', owns: under('account-orders') },
    { key: 'addresses', icon: 'i-lucide-map-pin', route: 'account-addresses', owns: under('account-addresses') },
    ...(favouritesEnabled.value
      ? [{ key: 'favourites', icon: 'i-lucide-heart', route: 'account-favourites-products', owns: under('account-favourites') } as const]
      : []),
    ...(reviewsEnabled.value
      ? [{ key: 'reviews', icon: 'i-lucide-thumbs-up', route: 'account-reviews' } as const]
      : []),
    { key: 'notifications', icon: 'i-lucide-bell', route: 'account-notifications' },
    ...(tenantStore.loyaltyEnabled && loyaltySettings.value?.enabled
      ? [{ key: 'rewards', icon: 'i-lucide-hourglass', route: 'account-loyalty' } as const]
      : []),
    ...(tenantStore.giftCardsEnabled && giftCardsEnabled.value
      ? [{ key: 'gift_cards', icon: 'i-lucide-gift', route: 'account-gift-cards' } as const]
      : []),
    ...(tenantStore.b2bEnabled && b2bEnabled.value
      ? [{ key: 'business', icon: 'i-lucide-building-2', route: 'account-business' } as const]
      : []),
    ...(newsletterEnabled.value
      ? [{ key: 'newsletter', icon: 'i-lucide-mail', route: 'account-subscriptions' } as const]
      : []),
    { key: 'profile', icon: 'i-lucide-user', route: 'account-settings' },
    {
      key: 'security',
      icon: 'i-lucide-shield-check',
      route: 'account-security',
      owns: name => SIGN_IN_PAGES.has(name) || under('account-2fa')(name),
    },
    { key: 'privacy', icon: 'i-lucide-lock', route: 'account-settings-privacy' },
  ])

  const routeName = computed(() => {
    const name = $routeBaseName(route)
    return typeof name === 'string' ? name : ''
  })

  const items = computed<AccountNavItem[]>(() => entries.value.map(entry => ({
    key: entry.key,
    label: t(`account_nav.${entry.key}`),
    icon: entry.icon,
    to: localePath(entry.route),
    active: routeName.value === entry.route || Boolean(entry.owns?.(routeName.value)),
    ...(entry.key === 'notifications' && unseenNotifications.value > 0
      ? { badge: unseenNotifications.value }
      : {}),
  })))

  /** The overview itself is on screen (a phone shows the tiles there). */
  const onOverview = computed(() => routeName.value === 'account')

  return { items, onOverview }
}
