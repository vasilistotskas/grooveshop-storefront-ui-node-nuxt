export interface NavLink {
  label: string
  to?: string
  href?: string
  icon?: string
}

export interface NavColumn {
  label: string
  icon?: string
  children: NavLink[]
}

/**
 * Per-tenant chrome navigation from Django's ``NavigationMenu`` rows.
 *
 * The payload only carries slots an operator has CONFIGURED — missing
 * slots resolve to ``null`` here, and each chrome consumer falls back
 * to its code-level menu (``useFooterLinks``, BurgerMenu's
 * ``primaryItems``), so an unconfigured tenant keeps the platform
 * chrome exactly as it is today.
 */
export function useNavigation() {
  const { data } = useFetch<Record<string, unknown[]>>(
    '/api/page-config/navigation',
    { key: 'page-config-navigation' },
  )

  const headerItems = computed<NavLink[] | null>(() => {
    const items = data.value?.header
    return Array.isArray(items) && items.length > 0
      ? (items as NavLink[])
      : null
  })

  const footerColumns = computed<NavColumn[] | null>(() => {
    const items = data.value?.footer
    return Array.isArray(items) && items.length > 0
      ? (items as NavColumn[])
      : null
  })

  const mobileItems = computed<NavLink[] | null>(() => {
    const items = data.value?.mobile
    return Array.isArray(items) && items.length > 0
      ? (items as NavLink[])
      : null
  })

  return { headerItems, footerColumns, mobileItems }
}
