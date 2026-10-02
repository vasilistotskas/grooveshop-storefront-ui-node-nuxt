/**
 * The store's published content pages (FAQ, shipping information, the
 * legal documents, …) as footer links.
 *
 * Every entry is a row that exists and is published for THIS tenant,
 * so a link built from it can never 404. A slug with a dedicated route
 * is linked at THAT route, not at `/info/<slug>`: both render the same
 * document and `/info/<slug>` permanently redirects to the canonical
 * one, so linking the redirect would make every footer click a 301.
 *
 * The one reader of the `footer-content-pages` key — both footers
 * (`useFooterLinks` for the frozen tree, `useFooterNavigation` for the
 * default) go through here, which keeps their request options identical.
 */
export function useFooterContentPages() {
  const { $i18n } = useNuxtApp()
  const localePath = useLocalePath()

  const { data } = useApi('/api/content-pages', {
    key: 'footer-content-pages',
    query: { pageSize: 50, ordering: 'slug' },
  })

  const links = computed<FooterLink[]>(() =>
    (data.value?.results ?? []).map((page) => {
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
  )

  return { links }
}
