interface FooterLinkColumn {
  label: string
  icon?: string
  children: { label: string, to: string }[]
}

export function useFooterLinks() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const localePath = useLocalePath()
  const { footerColumns } = useNavigation()

  // Operator-configured footer wins (per-tenant NavigationMenu rows);
  // the code-level columns below are the fallback for tenants that have
  // published none.
  //
  // The fallback carries only links EVERY store has. Brand-specific
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
  // fallback. What remains here are the pages every store always has.
  const fallbackColumns = computed<FooterLinkColumn[]>(() => [
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
      ],
    },
  ])

  const columns = computed<FooterLinkColumn[]>(() => {
    const configured = footerColumns.value
    if (!configured) return fallbackColumns.value
    return configured.map(column => ({
      label: column.label,
      icon: column.icon,
      children: column.children.map(child => ({
        label: child.label,
        to: child.to ?? child.href ?? '/',
      })),
    }))
  })

  return { columns }
}
