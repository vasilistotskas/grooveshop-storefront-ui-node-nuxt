export function useFooterLinks() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const localePath = useLocalePath()
  const { footerColumns } = useNavigation()
  const tenantStore = useTenantStore()

  // Feature-gated default links: a footer must never advertise a
  // page the feature gates would 404. Gift cards = two-tier
  // (fail-closed); feedback = merchant setting (fail-open).
  const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', {
    fallback: false,
  })
  const giftCardsEnabled = computed(
    () => tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value,
  )
  const feedbackEnabled = useSettingFlag('FEEDBACK_ENABLED', {
    fallback: true,
  })

  // Published ContentPages (per-tenant CMS pages, e.g. FAQ/shipping info)
  // are always safe to link unconditionally — unlike the removed
  // brand-only routes above, every entry here is a row that actually
  // exists and is published for THIS tenant, so it can never 404.
  const { data: contentPagesData } = useApi('/api/content-pages', {
    key: 'footer-content-pages',
    query: { pageSize: 50, ordering: 'slug' },
  })

  const contentPagesColumn = computed<FooterLinkColumn | null>(() => {
    const pages = contentPagesData.value?.results
    if (!pages || pages.length === 0) return null
    return {
      label: t('footer.pages'),
      icon: 'i-heroicons-document-text',
      children: pages.map((page) => {
        // A slug with a dedicated route is linked at THAT route, not at
        // /info/<slug>. Both render the same document and /info/<slug>
        // permanently redirects to the canonical one, so linking the
        // redirect would make every footer click a 301 for no reason.
        const canonical = (
          Object.keys(LEGAL_ROUTE_SLUGS) as LegalRouteName[]
        ).find(name => LEGAL_ROUTE_SLUGS[name] === page.slug)
        return {
          label: extractTranslated(page, 'title', $i18n.locale.value) ?? page.slug,
          to: canonical
            ? localePath(canonical)
            : localePath({ name: 'info-slug', params: { slug: page.slug } }),
        }
      }),
    }
  })

  // Operator-configured footer wins (per-tenant NavigationMenu rows);
  // the code-level columns below are the DEFAULT for a tenant that has
  // published none — which is most of them, so this is the ordinary
  // render path, not a degraded one. It cannot be deleted: a store
  // that has configured nothing still has to reach its terms, privacy
  // and cookies pages.
  //
  // It carries only links EVERY store has. Brand-specific
  // information architecture belongs in a NavigationMenu row, not here:
  // this list used to include "Όραμα" and a whole Microlearning column,
  // so every tenant's footer advertised another company's product
  // concept and linked to /vision, /what-is-microlearning and
  // /why-microlearning — pages that render an empty body for any tenant
  // without a published layout, i.e. crawlable soft-404s. Webside keeps
  // those links because ``manage.py seed_brand_pages`` publishes both
  // the pages and its footer menu together.
  // /about is layout-driven too, so it 404s for a tenant that has not
  // published one — it belongs in the seeded menu, not the universal
  // default. What remains here are the pages every store always has.
  const defaultColumns = computed<FooterLinkColumn[]>(() => [
    {
      label: t('footer.terms_conditions'),
      icon: 'i-heroicons-rectangle-group',
      children: [
        { label: t('footer.term_of_use'), to: localePath('terms-of-use') },
        { label: t('footer.privacy_policy'), to: localePath('privacy-policy') },
        { label: t('footer.cookies_policy'), to: localePath('cookies-policy') },
      ],
    },
    {
      label: t('footer.help_center'),
      icon: 'i-heroicons-chat-bubble-left-right',
      children: [
        { label: t('footer.contact.us'), to: localePath('contact') },
        ...(feedbackEnabled.value
          ? [{ label: t('footer.feedback'), to: localePath('feedback') }]
          : []),
        ...(giftCardsEnabled.value
          ? [{ label: t('gift_cards'), to: localePath('gift-cards') }]
          : []),
      ],
    },
  ])

  const columns = computed<FooterLinkColumn[]>(() => {
    const configured = footerColumns.value
    const base = !configured
      ? defaultColumns.value
      : configured.map(column => ({
          label: column.label,
          icon: column.icon,
          children: column.children.map(child => ({
            label: child.label,
            to: child.to ?? child.href ?? '/',
          })),
        }))

    // Drop a ContentPage from the Pages column when the base column set
    // ALREADY links its route, so one destination gets one footer link
    // and the operator's own label and placement win. See
    // dedupeFooterContentPages for why this is conditional on the base
    // carrying the link, and why it compares locale-stripped paths.
    const pagesColumn = contentPagesColumn.value
    if (!pagesColumn) return base

    const children = dedupeFooterContentPages(base, pagesColumn.children)

    return children.length ? [...base, { ...pagesColumn, children }] : base
  })

  return { columns }
}
