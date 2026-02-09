import type { RouteLocationAsRelativeI18n } from 'vue-router'

interface IMenuItem {
  type: 'link' | 'button' | 'external-link'
  text: string
  href?: string
  route?: Omit<RouteLocationAsRelativeI18n, 'path'> & { path?: string | undefined }
  icon?: string
  cssClass?: string
}

export const useAccountMenus = () => {
  const { $i18n } = useNuxtApp()
  const { loyaltyEnabled, settings, fetchSettings } = useLoyalty()

  // Fetch loyalty settings if not already loaded
  if (!settings.value) {
    fetchSettings()
  }

  const menus = computed<IMenuItem[]>(() => {
    const baseMenus: IMenuItem[] = [
      {
        type: 'link',
        text: $i18n.t('favourites'),
        route: {
          name: 'account-favourites-posts',
          path: '/account/favourites/posts',
        },
        icon: 'i-mdi-heart-outline',
      },
      {
        type: 'link',
        text: $i18n.t('subscriptions'),
        route: { name: 'account-subscriptions', path: '/account/subscriptions' },
        icon: 'i-heroicons-bell',
      },
    ]

    // Only add loyalty menu if enabled
    if (loyaltyEnabled.value) {
      baseMenus.push({
        type: 'link',
        text: $i18n.t('loyalty'),
        route: { name: 'account-loyalty', path: '/account/loyalty' },
        icon: 'i-heroicons-trophy',
      })
    }

    baseMenus.push({
      type: 'link',
      text: $i18n.t('settings'),
      route: { name: 'account-settings', path: '/account/settings' },
      icon: 'i-mdi-cog-outline',
    })

    return baseMenus
  })

  const { enabled } = useAuthPreviewMode()

  const allMenus = computed<IMenuItem[]>(() => {
    const items = [...menus.value]

    if (enabled.value) {
      items.push(
        {
          type: 'link',
          text: $i18n.t('addresses'),
          route: { name: 'account-addresses', path: '/account/addresses' },
          icon: 'i-fa6-solid-address-book',
        },
        {
          type: 'link',
          text: $i18n.t('orders'),
          route: { name: 'account-orders', path: '/account/orders' },
          icon: 'i-mdi-package-variant-closed',
        },
        {
          type: 'link',
          text: $i18n.t('reviews'),
          route: { name: 'account-reviews', path: '/account/reviews' },
          icon: 'i-mdi-star-outline',
        },
        {
          type: 'link',
          text: $i18n.t('help'),
          route: { name: 'account-help', path: '/account/help' },
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
