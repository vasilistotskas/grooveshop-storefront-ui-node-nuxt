interface FooterLinkColumn {
  label: string
  icon?: string
  children: { label: string, to: string }[]
}

export function useFooterLinks() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  const columns = computed<FooterLinkColumn[]>(() => [
    {
      label: t('footer.about.us'),
      icon: 'i-heroicons-information-circle',
      children: [
        { label: t('footer.about.site'), to: 'about' },
        { label: t('footer.vision'), to: 'vision' },
      ],
    },
    {
      label: t('footer.microlearning.title'),
      icon: 'i-heroicons-light-bulb',
      children: [
        { label: t('footer.microlearning.what'), to: 'what-is-microlearning' },
        { label: t('footer.microlearning.why'), to: 'why-microlearning' },
      ],
    },
    {
      label: t('footer.terms_conditions'),
      icon: 'i-heroicons-rectangle-group',
      children: [
        { label: t('footer.term_of_use'), to: 'terms-of-use' },
        { label: t('footer.privacy_policy'), to: 'privacy-policy' },
        { label: t('footer.cookies_policy'), to: 'cookies-policy' },
      ],
    },
    {
      label: t('footer.help_center'),
      icon: 'i-heroicons-chat-bubble-left-right',
      children: [
        { label: t('footer.contact.us'), to: 'contact' },
      ],
    },
  ])

  return { columns }
}
