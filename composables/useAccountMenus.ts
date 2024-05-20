import type { FunctionalComponent, SVGAttributes } from 'vue'
import settingsIcon from '~icons/mdi/cog-outline'
import favouritesIcon from '~icons/mdi/heart-outline'
import helpIcon from '~icons/mdi/help-circle-outline'
import ordersIcon from '~icons/mdi/package-variant-closed'
import reviewsIcon from '~icons/mdi/star-outline'
import shieldIcon from '~icons/mdi/shield-check'

interface IMenuItem {
  type: 'link' | 'button' | 'external-link'
  text: string
  href?: string
  route?: { name: string, path: string }
  icon?: FunctionalComponent<SVGAttributes>
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
      icon: favouritesIcon,
      cssClass:
        'text-primary-950 dark:text-primary-50 bg-primary-100 border-primary-500 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
    },
    {
      type: 'link',
      text: t('pages.account.settings.title'),
      route: { name: 'account-settings', path: '/account/settings' },
      icon: settingsIcon,
      cssClass:
        'text-primary-950 dark:text-primary-50 bg-primary-100 border-primary-500 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
    },
    {
      type: 'link',
      text: t('common.security'),
      route: { name: 'account-security', path: '/account/security' },
      icon: shieldIcon,
      cssClass:
        'text-primary-950 dark:text-primary-50 bg-primary-100 border-primary-500 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
    },
  ])

  if (import.meta.dev) {
    menus.value.push(
      {
        type: 'link',
        text: t('pages.account.orders.title'),
        route: { name: 'account-orders', path: '/account/orders' },
        icon: ordersIcon,
        cssClass:
          'text-primary-950 dark:text-primary-50 bg-primary-100 border-gray-200 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
      },
      {
        type: 'link',
        text: t('pages.account.reviews.title'),
        route: { name: 'account-reviews', path: '/account/reviews' },
        icon: reviewsIcon,
        cssClass:
          'text-primary-950 dark:text-primary-50 bg-primary-100 border-gray-200 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
      },
      {
        type: 'link',
        text: t('pages.account.help.title'),
        route: { name: 'account-help', path: '/account/help' },
        icon: helpIcon,
        cssClass:
          'text-primary-950 dark:text-primary-50 bg-primary-100 border-gray-200 hover:bg-primary-300 dark:border-slate-800 dark:bg-primary-900 dark:hover:bg-primary-700',
      },
    )
  }

  return {
    menus,
  }
}
