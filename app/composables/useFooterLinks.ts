interface FooterLinkColumn {
  label: string
  icon?: string
  children: { label: string, to: string }[]
}

export function useFooterLinks() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const localePath = useLocalePath()
  const tenantStore = useTenantStore()
  const { footerColumns } = useNavigation()

  // The "about the site" link reads "About {storeName}" so each tenant
  // gets its own brand name in the footer nav without duplicating the
  // translation strings.
  const storeName = computed(() => tenantStore.storeName || '')

  // Operator-configured footer wins (per-tenant NavigationMenu rows);
  // the code-level columns below are the fallback that keeps the
  // platform chrome untouched for unconfigured tenants.
  const fallbackColumns = computed<FooterLinkColumn[]>(() => [
    {
      label: t('footer.about.us'),
      icon: 'i-heroicons-information-circle',
      children: [
        {
          label: t('footer.about.site', { storeName: storeName.value }),
          to: localePath('about'),
        },
        { label: t('footer.vision'), to: localePath('vision') },
      ],
    },
    {
      label: t('footer.microlearning.title'),
      icon: 'i-heroicons-light-bulb',
      children: [
        { label: t('footer.microlearning.what'), to: localePath('what-is-microlearning') },
        { label: t('footer.microlearning.why'), to: localePath('why-microlearning') },
      ],
    },
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
