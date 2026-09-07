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
  // Menu labels are operator content, so a multilingual store supplies
  // one menu per language and Django resolves which. The locale must be
  // in the key as well as the query — otherwise /en renders the Greek
  // header from the payload cached on the default-locale route.
  //
  // `$i18n` (the global Composer on the Nuxt app context) rather than
  // `useI18n()`, for the same reason as `usePageConfig`: no component
  // instance is required, so the composable also works from a test and
  // from anything that calls it past the first await.
  const { locale } = useNuxtApp().$i18n
  const { data } = useFetch<Record<string, unknown[]>>(
    '/api/page-config/navigation',
    {
      key: () => `page-config-navigation-${locale.value}`,
      query: { locale },
    },
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
