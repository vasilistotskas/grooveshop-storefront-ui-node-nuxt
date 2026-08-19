/**
 * Per-tenant page layouts from Django's ``page_config`` app.
 *
 * ``FALLBACK_LAYOUTS`` is the code-level safety net rendered when a
 * tenant has no PUBLISHED layout for the pageType (404/unpublished).
 * ``home`` mirrors the platform homepage STRUCTURE (blog categories
 * rail → banner carousel → blog posts list); banner artwork is tenant
 * DATA (hero_carousel section props — see ``seed_brand_pages``), so
 * the prop-less fallback hero renders nothing rather than another
 * store's promo. The marketing pageTypes default to EMPTY: their pages
 * carry their own static content and the builder only ADDS branded
 * bands above it.
 *
 * Keep entries in lockstep with ``page_config/defaults.py`` on the
 * Django side (one entry per supported pageType).
 */
const FALLBACK_LAYOUTS: Record<string, PageSection[]> = {
  home: [
    { id: 0, uuid: 'fallback-blog-categories', componentType: 'blog_categories', title: '', isVisible: true, props: {}, sortOrder: 0 },
    { id: 0, uuid: 'fallback-hero-carousel', componentType: 'hero_carousel', title: '', isVisible: true, props: {}, sortOrder: 1 },
    { id: 0, uuid: 'fallback-recently-viewed', componentType: 'recently_viewed', title: '', isVisible: true, props: {}, sortOrder: 2 },
    { id: 0, uuid: 'fallback-blog-posts-list', componentType: 'blog_posts_list', title: '', isVisible: true, props: {}, sortOrder: 3 },
  ],
  products: [],
  blog: [],
  about: [],
  contact: [],
}

export function usePageConfig(pageType: string) {
  const { data, status, error } = useFetch<PageLayout>(
    `/api/page-config/${pageType}`,
    { key: `page-config-${pageType}` },
  )

  const sections = computed<PageSection[]>(() => {
    if (data.value?.isPublished && data.value.sections) {
      return data.value.sections
        .filter(s => s.isVisible)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    }
    return FALLBACK_LAYOUTS[pageType] ?? []
  })

  return { data, sections, status, error }
}
