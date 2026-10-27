import { SUPPORTED_LOCALES, type SupportedLocale } from '~~/i18n/locales'

/**
 * Everything a CMS page (`/info/[slug]`) needs that is not its drawing:
 * the page itself, the 404/503 a missing or failing one becomes, the
 * document in the language it exists in, and the head (title, description,
 * canonical, Open Graph).
 *
 * Shared by every drawing of the page (`Storefront/Info.vue` and the
 * tenants' own). Call it from a body's `<script setup>`, before the first
 * `await`.
 */
export async function useInfoPage() {
  const { t, locale } = useI18n()
  const route = useRoute(`info-slug___${locale.value}`)
  const siteConfig = useSiteConfig()
  const localePath = useLocalePath()
  // Every store and composable is read before the first await (see
  // useBlogPostPage).
  const { transformImages } = useHtmlContent()
  const tenantStore = useTenantStore()
  const { declare } = useDocumentLocales()

  const slug = computed(() => route.params.slug)

  // One document, ONE url. Four of these slugs are also served by a
  // dedicated route (``LEGAL_ROUTE_SLUGS``), and before this redirect both
  // answered 200 with the same body and a canonical pointing at itself —
  // tenant #2 had `/privacy-policy` and `/info/privacy` competing that way
  // in production. The dedicated route is the canonical one: it is what
  // the footer links and what the sitemap lists, so this one redirects to
  // it permanently rather than advertising a second address for the same
  // text.
  const canonicalLegalRoute = (
    Object.keys(LEGAL_ROUTE_SLUGS) as LegalRouteName[]
  ).find(name => LEGAL_ROUTE_SLUGS[name] === slug.value)

  if (canonicalLegalRoute) {
    await navigateTo(localePath(canonicalLegalRoute), {
      redirectCode: 301,
      replace: true,
    })
  }

  // ``page: null`` is how the route reports "no published page at this
  // slug" — an absent resource, cached and quiet, rather than a thrown
  // 404 that cost a round-trip and a stack trace per render. Here it
  // still becomes a real 404 for the visitor; only a 5xx means an outage.
  const { data: contentPageResponse, error: contentPageError }
    = await useApi<ContentPageResponse>(
      `/api/content-pages/${slug.value}`,
      {
        key: `contentPage${slug.value}`,
        method: 'GET',
        headers: useRequestHeaders(),
      },
    )

  const contentPage = computed(() => contentPageResponse.value?.page ?? null)

  if (contentPageError.value || !contentPage.value) {
    // Normalize upstream 5xx to 503 (see products/[id]/[slug].vue):
    // temporary for crawlers + retryable by error.vue's one-shot reload.
    const upstreamStatus = contentPageError.value?.statusCode ?? 404
    throw createError(
      upstreamStatus >= 500
        ? { statusCode: 503, message: t('error.service.unavailable') }
        : { statusCode: 404, message: t('error.page.not.found') },
    )
  }

  // The document in the visitor's language, or the language it EXISTS
  // in — the store's default first, then whatever else it serves. A row
  // with no body in this locale used to render an empty article at 200
  // (a soft-404 the legal routes were specifically fixed to stop); now it
  // renders the document it has, marked as such, and only a row with no
  // usable body in ANY language is a 404.
  const resolvedBody = computed(() =>
    resolveTranslated(contentPage.value, 'body', locale.value, [
      tenantStore.defaultLocale,
      ...tenantStore.availableLocales,
    ]),
  )
  if (!resolvedBody.value) {
    throw createError({ statusCode: 404, message: t('error.page.not.found') })
  }
  const documentLocale = computed(() => resolvedBody.value?.locale ?? locale.value)
  const isFallback = computed(() => documentLocale.value !== locale.value)
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
  declare(translatedLocales(contentPage.value.translations, 'body'))

  const pageTitle = computed(() =>
    extractTranslated(contentPage.value, 'title', documentLocale.value)
    ?? extractTranslated(contentPage.value, 'title', locale.value)
    ?? '',
  )

  const pageBody = computed(() => transformImages(resolvedBody.value?.value ?? ''))

  // SEO in the language of the document actually shown, like its title.
  const pageSeoTitle = computed(() =>
    extractTranslated(contentPage.value, 'seoTitle', documentLocale.value)
    || pageTitle.value,
  )
  // `undefined`, never '': an empty value still emits
  // `<meta name="description" content>`, which is strictly worse than no
  // tag at all (see blog/category/[id]/[slug].vue).
  //
  // The BODY is the fallback, the way a blog post uses its own — a CMS
  // page without an operator's meta description used to get no tag at
  // all, which loses the snippet on every result listing.
  const pageSeoDescription = computed(
    () => extractTranslated(contentPage.value, 'seoDescription', documentLocale.value)
      || composeMetaDescription([htmlToPlainText(pageBody.value)]),
  )

  // Canonical is built from the entity's own slug, not route.path, matching
  // blog/post and products/category — keeps a single indexable URL per page.
  // In the locale the document EXISTS in: a fallback render is a
  // non-canonical copy and must say so, or it is indexed twice. Only a
  // locale the storefront can route is a URL; a document that exists
  // solely in one it cannot keeps the current path.
  const canonicalLocale = computed(() =>
    (SUPPORTED_LOCALES as readonly string[]).includes(documentLocale.value)
      ? (documentLocale.value as SupportedLocale)
      : undefined,
  )
  const canonicalUrl = computed(
    () =>
      `${siteConfig.url}${localePath(
        { name: 'info-slug', params: { slug: contentPage.value?.slug ?? '' } },
        canonicalLocale.value,
      )}`,
  )

  useSeoMeta({
    title: () => pageSeoTitle.value,
    description: () => pageSeoDescription.value,
    ogTitle: () => pageSeoTitle.value,
    ogDescription: () => pageSeoDescription.value,
    ogUrl: () => canonicalUrl.value,
    ogType: 'website',
  })

  useHead({
    link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
  })

  return { contentPage, pageTitle, pageBody, documentLocale, isFallback, fallbackLanguageName }
}
