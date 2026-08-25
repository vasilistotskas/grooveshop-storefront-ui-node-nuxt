export const useAccountMenus = () => {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  const tenantStore = useTenantStore()

  // Fetch loyalty settings using new API
  const { data: settings } = useLoyalty().fetchSettings()

  // "My reviews" is gated on the per-tenant ACCOUNT_REVIEWS_ENABLED
  // extra-setting — a store preference the operator edits through
  // their own settings admin. It used to hide behind the storefront's
  // superuser-only preview mode, which only hid this link while the
  // route stayed reachable by URL; the real gate is the paired
  // account-reviews-enabled middleware, this just keeps the menu
  // honest. Fail-open default mirrors the Django default (enabled).
  const { data: reviewsSetting } = useFetch<{ value?: string }>(
    '/api/settings/get',
    {
      key: 'account-menus:reviews-enabled',
      query: { key: 'ACCOUNT_REVIEWS_ENABLED' },
      default: () => ({ value: 'true' }),
    },
  )
  const reviewsEnabled = computed(
    () =>
      (reviewsSetting.value?.value ?? 'true').toLowerCase() === 'true',
  )

  // Gift cards runtime toggle — fail-closed default mirrors the Django
  // default (disabled) so the menu never advertises a dead page.
  const { data: giftCardsSetting } = useFetch<{ value?: string }>(
    '/api/settings/get',
    {
      key: 'account-menus:gift-cards-enabled',
      query: { key: 'GIFT_CARDS_ENABLED' },
      default: () => ({ value: 'false' }),
    },
  )
  const giftCardsRuntimeEnabled = computed(
    () =>
      (giftCardsSetting.value?.value ?? 'false').toLowerCase() === 'true',
  )

  const menus = computed(() => {
    const baseMenus = [
      {
        label: t('account'),
        to: '/account',
        icon: 'i-heroicons-user',
      },
      {
        label: t('orders'),
        to: '/account/orders',
        icon: 'i-mdi-package-variant-closed',
      },
      {
        label: t('favourites'),
        to: '/account/favourites/posts',
        icon: 'i-mdi-heart-outline',
      },
      {
        label: t('notifications'),
        to: '/account/notifications',
        icon: 'i-heroicons-bell',
      },
      {
        label: t('subscriptions'),
        to: '/account/subscriptions',
        icon: 'i-heroicons-envelope',
      },
      {
        label: t('addresses'),
        to: '/account/addresses',
        icon: 'i-fa6-solid-address-book',
      },
    ]

    // Only add loyalty menu when both the tenant plan gate and the runtime
    // operational toggle are enabled. This mirrors the two-tier gate in
    // app/middleware/loyalty-enabled.ts.
    if (tenantStore.loyaltyEnabled && settings.value?.enabled) {
      baseMenus.push({
        label: t('loyalty'),
        to: '/account/loyalty',
        icon: 'i-heroicons-trophy',
      })
    }

    // Same two-tier gate for gift cards (app/middleware/gift-cards-enabled.ts).
    if (tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value) {
      baseMenus.push({
        label: t('gift_cards'),
        to: '/account/gift-cards',
        icon: 'i-heroicons-gift',
      })
    }

    baseMenus.push({
      label: t('settings'),
      to: '/account/settings',
      icon: 'i-mdi-cog-outline',
    })

    return baseMenus
  })

  const allMenus = computed(() => {
    const items = [...menus.value]

    if (reviewsEnabled.value) {
      items.push({
        label: t('reviews'),
        to: '/account/reviews',
        icon: 'i-mdi-star-outline',
      })
    }

    return items
  })

  return {
    menus: allMenus,
  }
}
