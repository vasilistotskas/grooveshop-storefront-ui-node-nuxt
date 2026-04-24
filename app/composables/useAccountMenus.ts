export const useAccountMenus = () => {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  // Fetch loyalty settings using new API
  const { data: settings } = useLoyalty().fetchSettings()

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

    // Only add loyalty menu if enabled
    if (settings.value?.enabled) {
      baseMenus.push({
        label: t('loyalty'),
        to: '/account/loyalty',
        icon: 'i-heroicons-trophy',
      })
    }

    baseMenus.push({
      label: t('settings'),
      to: '/account/settings',
      icon: 'i-mdi-cog-outline',
    })

    return baseMenus
  })

  const { enabled } = useAuthPreviewMode()

  const allMenus = computed(() => {
    const items = [...menus.value]

    if (enabled.value) {
      items.push(
        {
          label: t('reviews'),
          to: '/account/reviews',
          icon: 'i-mdi-star-outline',
        },
        {
          label: t('help'),
          to: '/account/help',
          icon: 'i-mdi-help-circle-outline',
        },
      )
    }

    return items
  })

  return {
    menus: allMenus,
  }
}
