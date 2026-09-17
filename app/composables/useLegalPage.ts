/**
 * The tenant's own legal document, and its table of contents.
 *
 * These pages used to ship the platform's Greek legal text as markup and
 * fall back to it whenever the tenant had published nothing at the
 * matching slug. That made the platform the author of a document that
 * binds the MERCHANT — the shipped terms fixed a governing law and a
 * dispute forum on their behalf — and it meant two render paths of which
 * only one was ever exercised. The unexercised one shipped a duplicate
 * `h1` and a table of contents anchored to ids that existed solely in
 * the boilerplate.
 *
 * So there is one path now. Every tenant is seeded the real documents,
 * published, at provisioning (`page_config.legal_documents` on the API),
 * and these routes render that row. An absent page is therefore a
 * genuine 404 rather than a cue to render something else, which is what
 * the caller does with it.
 */
export async function useLegalPage(slug: string) {
  const { locale } = useI18n()
  const { transformImages } = useHtmlContent()

  // AWAITED, and that is load-bearing: the caller reads `hasDocument`
  // synchronously in setup to decide between rendering and a 404. An
  // un-awaited useFetch has not resolved by then, so every legal page
  // 404s on its own data before the request comes back — caught by the
  // e2e render smoke, which is the only test that boots a real server.
  // Same shape as `await usePageConfig('about')` in app/pages/about.vue.
  const { data, error } = await useFetch<ContentPageResponse>(
    `/api/content-pages/${slug}`,
    {
      key: `legal-page-${slug}`,
      method: 'GET',
      headers: useRequestHeaders(),
      // The server route answers a missing page with `{ page: null }`
      // rather than throwing, so absence is cached like any other
      // response and only a real outage surfaces as `error`.
      default: () => ({ page: null }),
    },
  )

  const page = computed(() => data.value?.page ?? null)

  const title = computed(
    () => extractTranslated(page.value, 'title', locale.value) ?? '',
  )

  /**
   * Body and contents are derived together: `buildLegalToc` guarantees
   * an anchor target for every heading it lists, which it can only do by
   * returning the html it may have added ids to.
   */
  const document = computed(() => {
    const raw = extractTranslated(page.value, 'body', locale.value) ?? ''
    return buildLegalToc(transformImages(raw))
  })

  const body = computed(() => document.value.html)
  const tocLinks = computed(() => document.value.links)

  /** The merchant's own timestamp — it is their document. */
  const updatedAt = computed(() => page.value?.updatedAt ?? null)

  /**
   * True when there is a document to show. A row that exists with an
   * empty body is as unusable as no row at all, and must 404 rather than
   * render a page with a heading and nothing under it.
   */
  const hasDocument = computed(
    () => body.value.replace(/<[^>]*>/g, '').trim().length > 0,
  )

  return { page, title, body, tocLinks, updatedAt, hasDocument, error }
}
