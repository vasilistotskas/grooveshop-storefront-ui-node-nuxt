export const useAccountMenus = () => {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  // The store's features — the same answer the paired route middlewares
  // and Django's permissions give, so the menu never advertises a dead
  // page. `accountReviews` already needs `productReviews` on.
  const reviewsEnabled = useStoreFeature('accountReviews')
  const favouritesEnabled = useStoreFeature('favourites')
  const newsletterEnabled = useStoreFeature('newsletter')
  const blogEnabled = useStoreFeature('blog')
  const loyaltyEnabled = useStoreFeature('loyalty')
  const giftCardsServing = useGatedRoute('/account/gift-cards')
  const wholesaleEnabled = useStoreFeature('wholesale')

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
              // The posts tab exists only with the blog; without it
              // the favourites live on the products tab.
              to: blogEnabled.value
                ? '/account/favourites/posts'
                : '/account/favourites/products',
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

    if (loyaltyEnabled.value) {
      baseMenus.push({
        label: t('loyalty'),
        to: '/account/loyalty',
        icon: 'i-heroicons-trophy',
      })
    }

    if (giftCardsServing.value) {
      baseMenus.push({
        label: t('gift_cards'),
        to: '/account/gift-cards',
        icon: 'i-heroicons-gift',
      })
    }

    if (wholesaleEnabled.value) {
      baseMenus.push({
        label: t('business_account'),
        to: '/account/business',
        icon: 'i-heroicons-briefcase',
      })
    }

    baseMenus.push(
      {
        label: t('settings'),
        to: '/account/settings',
        icon: 'i-mdi-cog-outline',
      },
      {
        label: t('account_nav.security'),
        to: '/account/security',
        icon: 'i-heroicons-shield-check',
      },
    )

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
