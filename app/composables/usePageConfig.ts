/**
 * Per-tenant page layouts from Django's ``page_config`` app.
 *
 * ``FALLBACK_LAYOUTS`` is the code-level safety net rendered when a
 * tenant has no PUBLISHED layout for the pageType — the route answers
 * ``{ layout: null }`` for that (see ``shared/types/pageConfig.ts``) —
 * and when the backend is unavailable (``error`` set).
 *
 * ``home`` is a SHOP's homepage: browse the catalogue, then the content
 * around it. Every section in it is data-driven and renders nothing
 * when its data or its tenant flag is absent, so the stack degrades to
 * whatever the store actually has rather than to empty cards — which is
 * what the previous blog-first fallback did, opening a brand-new store
 * on "no articles yet" above a carousel with no artwork. The marketing
 * pageTypes default to EMPTY: their pages carry their own static
 * content and the builder only ADDS branded bands above it.
 *
 * ``surface`` alternates ground and raised down the stack: the
 * storefront draws each section as a full-width BAND, and two
 * neighbours on the same surface read as one. Sections that can render
 * nothing are skipped in the count on purpose — they vanish, and the
 * bands that remain still alternate.
 *
 * Keep entries in lockstep with ``page_config/defaults.py`` on the
 * Django side (one entry per supported pageType).
 */
const FALLBACK_LAYOUTS: Record<string, PageSection[]> = {
  home: [
    { id: 0, uuid: 'fallback-product-categories', componentType: 'product_categories', title: '', isVisible: true, props: { surface: 'default' }, sortOrder: 0 },
    { id: 0, uuid: 'fallback-featured-products', componentType: 'featured_products', title: '', isVisible: true, props: { surface: 'muted' }, sortOrder: 1 },
    { id: 0, uuid: 'fallback-products-slider', componentType: 'products_slider', title: '', isVisible: true, props: { ordering: 'newest', surface: 'default' }, sortOrder: 2 },
    { id: 0, uuid: 'fallback-recently-viewed', componentType: 'recently_viewed', title: '', isVisible: true, props: {}, sortOrder: 3 },
    { id: 0, uuid: 'fallback-blog-posts-grid', componentType: 'blog_posts_grid', title: '', isVisible: true, props: { surface: 'default' }, sortOrder: 4 },
    { id: 0, uuid: 'fallback-newsletter-signup', componentType: 'newsletter_signup', title: '', isVisible: true, props: { surface: 'muted' }, sortOrder: 5 },
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
  // Section titles and props are operator-authored JSON resolved
  // per-locale by Django (`page_config/localization.py`), not parler
  // translations the client picks from — so the locale has to travel
  // with the request AND be part of the payload key, or /en reuses the
  // Greek copy already cached under a locale-less key.
  //
  // `useI18n()`, NOT `useNuxtApp().$i18n`. Every page calls this at the
  // top of its own `setup()`, which is exactly where vue-i18n's
  // composable is valid. `$i18n` looks like the context-free
  // alternative and is not: @nuxtjs/i18n injects it from its own setup
  // plugin, so it can be `undefined` — the module's own
  // `scrollBehavior` example guards with `if (nuxtApp.$i18n)`.
  // Destructuring it unguarded threw on every page render (500s across
  // every tenant on v3.170.1, server routes unaffected). If a caller
  // ever needs this outside a component, give it an explicit locale
  // argument rather than reaching for `$i18n`.
  const { locale } = useI18n()
  const { data, status, error } = await useApi<PageConfigResponse>(
    `/api/page-config/${pageType}`,
    {
      key: () => `page-config-${pageType}-${locale.value}`,
    },
  )

  const layout = computed<PageLayout | null>(() => data.value?.layout ?? null)

  // The operator's own <title> / meta description for the page
  // (``PageLayout``'s translated ``seo_title`` / ``seo_description`` —
  // the same per-language fields ContentPage, Product and BlogPost
  // carry). Django resolves them for the page locale this request states
  // and answers STRICTLY: a locale the operator has not translated
  // comes back empty rather than borrowing another language's copy, so
  // "empty" below still means "no tag" on every locale. Every
  // page-config page used to inherit the store-wide description and
  // the home page's title was the bare store name (Ahrefs "Meta
  // description too short" / "Title too short", 2026-09-11).
  //
  // An unset field emits NO tag at all — not a tag with an empty value,
  // which would still win the dedupe and then be dropped, taking the
  // page's own default with it — so the page keeps its defaults. When
  // set, the value must beat those defaults even though this entry
  // registers FIRST (``usePageConfig`` is awaited at the top of every
  // page's setup; the page's and its section variants' ``useSeoMeta``
  // come later): unhead's dedupe keeps the entry with the LOWER weight
  // and only falls back to "later wins" at equal weight (``dedupeTags``
  // in packages/unhead/src/utils/resolve.ts, unhead 3.3), so
  // ``tagPriority: 'high'`` is what makes the operator's value win.
  // ``seo_keywords`` is deliberately not emitted, as on the content
  // pages: search engines ignore it.
  useHead(() => {
    const title = layout.value?.seoTitle || ''
    const description = layout.value?.seoDescription || ''
    return {
      ...(title ? { title } : {}),
      meta: [
        ...(title ? [{ property: 'og:title', content: title }] : []),
        ...(description
          ? [
              { name: 'description', content: description },
              { property: 'og:description', content: description },
            ]
          : []),
      ],
    }
  }, { tagPriority: 'high' })

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
