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
  // `useI18n()`, for the same reason as `usePageConfig` — see the note
  // there on why `useNuxtApp().$i18n` is not the context-free
  // alternative it appears to be.
  const { locale } = useI18n()
  // Operator links are gated exactly as the pages gate themselves
  // (shared/utils/gatedRoutes.ts): a link to /offers on a store with
  // promotions off, or to /products with the catalogue switched off, is
  // a 404 the store would advertise on every page. The rows are not
  // touched — the operator's menu stays as they built it, and the link
  // reappears the moment the feature is switched on.
  const tenantStore = useTenantStore()
  const { settings, unavailable } = useStoreSettings()
  const blocked = computed(() =>
    blockedFeaturePaths(
      {
        loyaltyEnabled: tenantStore.loyaltyEnabled,
        blogEnabled: tenantStore.blogEnabled,
        promotionsEnabled: tenantStore.promotionsEnabled,
        giftCardsEnabled: tenantStore.giftCardsEnabled,
      },
      unavailable.value ? null : settings.value,
    ),
  )
  const serving = (link: NavLink) =>
    !link.to || !isFeaturePathBlocked(link.to, blocked.value)

  const { data } = useApi<Record<string, unknown[]>>(
    '/api/page-config/navigation',
    {
      key: () => `page-config-navigation-${locale.value}`,
      // Read by the header, the burger menu and the footer in the same
      // render: with the default 'cancel' each reader re-issued the
      // request (3x per page in the crawl logs). See useStoreSettings.
      dedupe: 'defer',
    },
  )

  const flatSlot = (slot: 'header' | 'mobile') =>
    computed<NavLink[] | null>(() => {
      const items = data.value?.[slot]
      if (!Array.isArray(items) || items.length === 0) return null
      const kept = (items as NavLink[]).filter(serving)
      return kept.length > 0 ? kept : null
    })

  const headerItems = flatSlot('header')
  const mobileItems = flatSlot('mobile')

  const footerColumns = computed<NavColumn[] | null>(() => {
    const items = data.value?.footer
    if (!Array.isArray(items) || items.length === 0) return null
    // A column emptied by the gate goes with its links: a bare heading
    // is noise, and the storefront's own contract requires children.
    const kept = (items as NavColumn[])
      .map(column => ({
        ...column,
        children: column.children.filter(serving),
      }))
      .filter(column => column.children.length > 0)
    return kept.length > 0 ? kept : null
  })

  return { headerItems, footerColumns, mobileItems }
}
