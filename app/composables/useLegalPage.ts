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
 *
 * A page that exists but not in the visitor's language is NOT absent.
 * It is rendered in the language it exists in — the tenant's default
 * first, since that is what its content is authored in — marked as such
 * (`documentLocale` for the article's `lang`, `fallbackNotice` for the
 * reader), with the canonical pointed at that locale's URL and the
 * missing locale's hreflang withheld (see `useDocumentLocales`). A 404
 * here told an English-speaking customer the store's terms did not
 * exist, which was false and left them no route to the terms at all.
 */
export async function useLegalPage(routeName: LegalRouteName) {
  const slug = LEGAL_ROUTE_SLUGS[routeName]
  const { locale } = useI18n()
  const tenantStore = useTenantStore()
  const { transformImages } = useHtmlContent()
  const { declare } = useDocumentLocales()

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

  /**
   * The order a missing translation falls back in: the store's default
   * locale (the language its content is authored in), then whatever
   * else it serves. Never a hardcoded language.
   */
  const fallbackLocales = computed(() => [
    tenantStore.defaultLocale,
    ...tenantStore.availableLocales,
  ])

  /**
   * Body and contents are derived together: `buildLegalToc` guarantees
   * an anchor target for every heading it lists, which it can only do by
   * returning the html it may have added ids to. The BODY decides the
   * locale — a title alone is not a document — and the title follows it
   * so the two never disagree.
   */
  const resolved = computed(() =>
    resolveTranslated(page.value, 'body', locale.value, fallbackLocales.value),
  )
  const documentLocale = computed(() => resolved.value?.locale ?? locale.value)
  const isFallback = computed(
    () => !!resolved.value && resolved.value.locale !== locale.value,
  )

  const title = computed(
    () =>
      extractTranslated(page.value, 'title', documentLocale.value)
      ?? extractTranslated(page.value, 'title', locale.value)
      ?? '',
  )

  const document = computed(() =>
    buildLegalToc(transformImages(resolved.value?.value ?? '')),
  )
  const body = computed(() => document.value.html)
  const tocLinks = computed(() => document.value.links)

  /** The merchant's own timestamp — it is their document. */
  const updatedAt = computed(() => page.value?.updatedAt ?? null)

  /**
   * True when there is a document to show in SOME language. A row that
   * exists with an empty body everywhere is as unusable as no row at
   * all, and must 404 rather than render a heading with nothing under
   * it.
   */
  const hasDocument = computed(() => !!resolved.value)

  /**
   * The language name for the notice, in the READER's language: an
   * English visitor is told "available in Greek only", not "Ελληνικά".
   * `Intl.DisplayNames` rather than a hand-kept list, so a new locale
   * needs no translation of its own name.
   */
  const fallbackLanguageName = computed(() => {
    if (!isFallback.value) return ''
    try {
      return (
        new Intl.DisplayNames([locale.value], { type: 'language' }).of(
          documentLocale.value,
        ) ?? documentLocale.value
      )
    }
    catch {
      return documentLocale.value
    }
  })

  // Tell the head pipeline which locales this document exists in, so
  // the canonical and the hreflang set say what is true for THIS route.
  if (page.value) {
    declare(
      Object.keys(page.value.translations ?? {}).filter(code =>
        !!resolveTranslated(page.value, 'body', code, []),
      ),
    )
  }

  return {
    page,
    title,
    body,
    tocLinks,
    updatedAt,
    hasDocument,
    error,
    documentLocale,
    isFallback,
    fallbackLanguageName,
  }
}
