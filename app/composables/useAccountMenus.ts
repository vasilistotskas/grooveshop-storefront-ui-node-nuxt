export const useAccountMenus = () => {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  const tenantStore = useTenantStore()

  // Fetch loyalty settings using new API
  const { data: settings } = useLoyalty().fetchSettings()

  // Merchant feature toggles — the real gates are the paired route
  // middlewares (and the Django permissions); these keep the menu
  // honest so it never advertises a dead page. Fail-open defaults
  // mirror the Django defaults (enabled), except gift cards which
  // defaults disabled.
  const reviewsEnabled = useSettingFlag('ACCOUNT_REVIEWS_ENABLED', {
    fallback: true,
  })
  const favouritesEnabled = useSettingFlag('FAVOURITES_ENABLED', {
    fallback: true,
  })
  const newsletterEnabled = useSettingFlag('NEWSLETTER_ENABLED', {
    fallback: true,
  })
  const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', {
    fallback: false,
  })

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
      ...(favouritesEnabled.value
        ? [
            {
              label: t('favourites'),
              to: '/account/favourites/posts',
              icon: 'i-mdi-heart-outline',
            },
          ]
        : []),
      {
        label: t('notifications'),
        to: '/account/notifications',
        icon: 'i-heroicons-bell',
      },
      ...(newsletterEnabled.value
        ? [
            {
              label: t('subscriptions'),
              to: '/account/subscriptions',
              icon: 'i-heroicons-envelope',
            },
          ]
        : []),
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
