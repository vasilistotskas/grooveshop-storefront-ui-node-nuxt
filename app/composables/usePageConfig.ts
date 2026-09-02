/**
 * Per-tenant page layouts from Django's ``page_config`` app.
 *
 * ``FALLBACK_LAYOUTS`` is the code-level safety net rendered when a
 * tenant has no PUBLISHED layout for the pageType — the route answers
 * ``{ layout: null }`` for that (see ``shared/types/pageConfig.ts``) —
 * and when the backend is unavailable (``error`` set). ``home`` mirrors
 * the platform homepage STRUCTURE (blog categories rail → banner
 * carousel → blog posts list); banner artwork is tenant DATA
 * (hero_carousel section props — see ``seed_brand_pages``), so the
 * prop-less fallback hero renders nothing rather than another store's
 * promo. The marketing pageTypes default to EMPTY: their pages carry
 * their own static content and the builder only ADDS branded bands
 * above it.
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

/**
 * ``await`` is load-bearing, not stylistic.
 *
 * On the server Nuxt registers useFetch's promise with
 * ``onServerPrefetch`` and lets setup continue synchronously (see
 * nuxt/dist/app/composables/asyncData.js) — it is awaited before
 * RENDER, not before the next statement. Callers that branch on
 * ``layout``/``error`` right after the call therefore read ``null`` on
 * every server render, which made the pages that throw 404 on an
 * unpublished layout throw it unconditionally. Awaiting here suspends
 * setup the way every other data-driven page in app/pages/** does
 * (``await useFetch`` in products/[id]/[slug].vue et al), so the refs
 * are settled by the time a caller inspects them.
 *
 * ``layout`` is ``null`` both while pending and when the tenant has no
 * published layout; callers that need to distinguish a backend outage
 * read ``error`` (5xx/network) — an absent layout never sets it.
 */
export async function usePageConfig(pageType: string) {
  const { data, status, error } = await useFetch<PageConfigResponse>(
    `/api/page-config/${pageType}`,
    { key: `page-config-${pageType}` },
  )

  const layout = computed<PageLayout | null>(() => data.value?.layout ?? null)

  const sections = computed<PageSection[]>(() => {
    if (layout.value?.isPublished && layout.value.sections) {
      return layout.value.sections
        .filter(s => s.isVisible)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    }
    return FALLBACK_LAYOUTS[pageType] ?? []
  })

  return { layout, sections, status, error }
}
