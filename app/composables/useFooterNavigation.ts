/**
 * The default footer's links, in the two weights the Groove Volt footer
 * gives them:
 *
 * - `primary` — the columns a shopper scans: Shop and Help. Visible on
 *   every width.
 * - `secondary` — company and legal links: one inline row in the
 *   desktop footer's bottom bar, one collapsed row on a phone.
 *
 * An operator-configured footer (the store's `footer` NavigationMenu)
 * replaces the code defaults, as it always has: its first two columns
 * are the primary ones and every later column's links are secondary —
 * the demo store's Shop, Help, Company and Legal columns land exactly
 * as the design draws them.
 *
 * The code defaults carry only what every store has, behind the same
 * gates as the pages they link to, so the footer never advertises a
 * page that would 404 (gift cards, promotions and loyalty are two-tier
 * and fail closed; feedback is a merchant setting that fails open).
 *
 * Published content pages the columns do not already link are added to
 * the secondary links, so no published document is left unreachable.
 *
 * The frozen webside footer reads `useFooterLinks`; this is the default
 * tree's own.
 */
export function useFooterNavigation() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const localePath = useLocalePath()
  const tenantStore = useTenantStore()
  const { footerColumns } = useNavigation()
  const { links: contentPageLinks } = useFooterContentPages()

  const catalogueEnabled = useSettingFlag('CATALOGUE_ENABLED', { fallback: true })
  const feedbackEnabled = useSettingFlag('FEEDBACK_ENABLED', { fallback: true })
  const promotionsRuntimeEnabled = useSettingFlag('PROMOTIONS_ENABLED', { fallback: false })
  const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', { fallback: false })
  const loyaltyRuntimeEnabled = useSettingFlag('LOYALTY_ENABLED', { fallback: false })

  const configured = computed<FooterLinkColumn[] | null>(() =>
    footerColumns.value?.map(column => ({
      label: column.label,
      icon: column.icon,
      children: column.children.map(child => ({
        label: child.label,
        to: child.to ?? child.href ?? '/',
      })),
    })) ?? null,
  )

  const defaultPrimary = computed<FooterLinkColumn[]>(() => {
    const shop: FooterLink[] = []
    if (catalogueEnabled.value) {
      shop.push({ label: t('footer.all_products'), to: localePath('/products') })
    }
    if (tenantStore.promotionsEnabled && promotionsRuntimeEnabled.value) {
      shop.push({ label: t('offers'), to: localePath('/offers') })
    }
    if (tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value) {
      shop.push({ label: t('gift_cards'), to: localePath('/gift-cards') })
    }
    if (tenantStore.loyaltyEnabled && loyaltyRuntimeEnabled.value) {
      shop.push({ label: t('footer.rewards_programme'), to: localePath('/loyalty-program') })
    }

    const help: FooterLink[] = [
      { label: t('footer.contact.us'), to: localePath('contact') },
    ]
    if (feedbackEnabled.value) {
      help.push({ label: t('footer.leave_feedback'), to: localePath('feedback') })
    }

    return [
      { label: t('footer.shop'), children: shop },
      { label: t('footer.help'), children: help },
    ].filter(column => column.children.length > 0)
  })

  const defaultSecondary = computed<FooterLink[]>(() => [
    ...(tenantStore.blogEnabled ? [{ label: t('blog'), to: localePath('/blog') }] : []),
    { label: t('footer.term_of_use'), to: localePath('terms-of-use') },
    { label: t('footer.privacy_policy'), to: localePath('privacy-policy') },
    { label: t('footer.cookies_policy'), to: localePath('cookies-policy') },
  ])

  const primary = computed(() =>
    configured.value ? configured.value.slice(0, 2) : defaultPrimary.value,
  )

  const secondary = computed<FooterLink[]>(() => {
    const base = configured.value
      ? configured.value.slice(2).flatMap(column => column.children)
      : defaultSecondary.value
    const linked: FooterLinkColumn[] = [...primary.value, { label: '', children: base }]
    return [...base, ...dedupeFooterContentPages(linked, contentPageLinks.value)]
  })

  return { primary, secondary }
}
