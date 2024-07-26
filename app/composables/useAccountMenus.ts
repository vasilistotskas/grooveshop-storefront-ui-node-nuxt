interface IMenuItem {
  type: 'link' | 'button' | 'external-link'
  text: string
  href?: string
  route?: { name: string, path: string }
  icon?: string
  cssClass?: string
}

export const useAccountMenus = () => {
  const { t } = useI18n()
  const menus = shallowRef<IMenuItem[]>([
    {
      type: 'link',
      text: t('common.favourites'),
      route: {
        name: 'account-favourites-posts',
        path: '/account/favourites/posts',
      },
      icon: 'i-mdi-heart-outline',
      cssClass:
        'text-primary-950 dark:text-primary-50 bg-primary-100 border-primary-500 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
    },
    {
      type: 'link',
      text: t('pages.account.settings.title'),
      route: { name: 'account-settings', path: '/account/settings' },
      icon: 'i-mdi-cog-outline',
      cssClass:
        'text-primary-950 dark:text-primary-50 bg-primary-100 border-primary-500 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
    },
  ])

  if (import.meta.dev) {
    menus.value.push(
      {
        type: 'link',
        text: t('pages.account.addresses.title'),
        route: { name: 'account-addresses', path: '/account/addresses' },
        icon: 'i-fa6-solid-address-book',
        cssClass:
          'text-primary-950 dark:text-primary-50 bg-primary-100 border-gray-200 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
      },
      {
        type: 'link',
        text: t('pages.account.orders.title'),
        route: { name: 'account-orders', path: '/account/orders' },
        icon: 'i-mdi-package-variant-closed',
        cssClass:
          'text-primary-950 dark:text-primary-50 bg-primary-100 border-gray-200 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
      },
      {
        type: 'link',
        text: t('pages.account.reviews.title'),
        route: { name: 'account-reviews', path: '/account/reviews' },
        icon: 'i-mdi-star-outline',
        cssClass:
          'text-primary-950 dark:text-primary-50 bg-primary-100 border-gray-200 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
      },
      {
        type: 'link',
        text: t('pages.account.help.title'),
        route: { name: 'account-help', path: '/account/help' },
        icon: 'i-mdi-help-circle-outline',
        cssClass:
          'text-primary-950 dark:text-primary-50 bg-primary-100 border-gray-200 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
      },
    )
  }

  return {
    menus,
  }
}
