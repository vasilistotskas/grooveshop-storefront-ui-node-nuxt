/**
 * Prefer a merchant's own legal page over the platform boilerplate.
 *
 * The shipped terms/privacy/cookies pages are PLATFORM text rendered
 * under the MERCHANT's name, which is the wrong way round for anything
 * legally binding: the terms fixed exclusive jurisdiction to one city's
 * courts for every tenant, whoever and wherever they were. Every tenant
 * is already seeded a ContentPage at the matching slug, so the fix is
 * to look for it and let it win.
 *
 * A missing or unpublished page is the NORMAL case, not an error — the
 * boilerplate is the fallback, so the failed lookup is swallowed
 * deliberately. `useFetch` surfaces that as `error` rather than
 * throwing, which is why this never calls `createError`: a store
 * without its own terms must still render terms.
 */
export function useLegalPage(slug: string) {
  const { locale } = useI18n()
  const { transformImages } = useHtmlContent()

  const { data } = useFetch(`/api/content-pages/${slug}`, {
    key: `legal-page-${slug}`,
    method: 'GET',
    headers: useRequestHeaders(),
    // An unpublished page 404s upstream; that is the expected path for
    // any store that has not written its own, so it must not surface.
    default: () => null,
  })

  /** True when the merchant published their own version of this page. */
  const hasMerchantPage = computed(() => {
    if (!data.value) return false
    const body = extractTranslated(data.value, 'body', locale.value) ?? ''
    // A seeded-but-empty page must not blank out the boilerplate.
    return body.trim().length > 0
  })

  const title = computed(() =>
    extractTranslated(data.value, 'title', locale.value) ?? '',
  )

  const body = computed(() => {
    const raw = extractTranslated(data.value, 'body', locale.value) ?? ''
    return transformImages(raw)
  })

  /**
   * The merchant's own last-modified date when their page is in use.
   *
   * The boilerplate carries a hardcoded platform date, which is wrong
   * the moment a merchant supplies their own text — the document they
   * are publishing is not the one that date refers to.
   */
  const updatedAt = computed(() => data.value?.updatedAt ?? null)

  return { hasMerchantPage, title, body, updatedAt }
}
