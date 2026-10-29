/**
 * What the products pages need that is not their drawing: the head, the
 * schema.org collection and its page-1 ItemList, and for a category page
 * the category itself with its 404/503.
 *
 * Shared by every drawing of the pages (`Storefront/ProductsIndex.vue`,
 * `Storefront/ProductsCategory.vue` and the tenants' own), so the
 * requests, their keys and the SEO are decided once. Call them from a
 * body's `<script setup>`, before the first `await`.
 */

/**
 * The products behind a collection's Schema.org ItemList: the page of the
 * listing the visitor is on, from the listing's own search (the page
 * composables start it, the listing and the filter column join it), so the
 * collection is machine-readable without a request of its own. Positions
 * continue from the page's `offset`.
 */
function itemListNode(baseUrl: string, name: () => string, products: Ref<ProductMeiliSearchResponse | null | undefined>, offset: Ref<number>) {
  useSchemaOrg([
    defineWebPage({ '@type': 'CollectionPage' }),
    // `itemListElement` is object-typed, so it cannot be a getter since
    // the @unhead/schema-org v3 definer-type rewrite — the whole node is
    // one computed instead.
    defineItemList(computed(() => ({
      name: name(),
      itemListElement: (products.value?.results ?? []).map((p, i) => ({
        '@type': 'ListItem' as const,
        'position': offset.value + i + 1,
        'url': `${baseUrl}/products/${p.master ?? p.id}/${p.slug}`,
        'name': p.name,
      })),
    }))),
  ])
}

/**
 * The store-wide products page's head and structured data, worded by the
 * drawing's own `t`.
 */
export async function useProductsIndexPage(t: ReturnType<typeof useI18n>['t']) {
  const { ogImageUrl } = useTenantBranding()
  const baseUrl = useSiteConfig().url

  const { request, offset } = useProductListingSearch(undefined)
  const { data: seoProducts } = await request

  useSeoMeta({
    // `seo.title`, not `title`: the latter is also the page's h1.
    title: () => t('seo.title'),
    description: () => t('seo.description'),
    ogTitle: () => t('seo.title'),
    ogDescription: () => t('seo.description'),
    ogType: 'website',
    // The tenant's own logo, so a social preview carries its brand.
    ogImage: ogImageUrl.value,
    ogImageAlt: () => t('title'),
  })

  itemListNode(baseUrl, () => t('title'), seoProducts, offset)
}

/** The category an `/products/category/[id]/[slug]` route names. */
export function useProductCategoryRouteId() {
  const { locale } = useI18n({ useScope: 'global' })
  const route = useRoute(`products-category-id-slug___${locale.value}`)

  return 'id' in route.params
    ? route.params.id
    : undefined
}

/**
 * A category page's category, its head and its structured data, worded
 * by the drawing's own `t`.
 */
export async function useProductCategoryPage(categoryId: string | undefined, t: ReturnType<typeof useI18n>['t']) {
  const { locale } = useI18n({ useScope: 'global' })
  const img = useMediaStreamImage()
  const { ogImageUrl } = useTenantBranding()
  const baseUrl = useSiteConfig().url
  // Before the first await, like every composable here: it reads Pinia
  // stores (see useBlogPostPage).
  const { declare, canonicalUrl } = useDocumentLocales()

  // Started before the category is awaited: it needs only the id, and a
  // request a composable starts after an await has no component instance,
  // so it would outlive the page (see useBlogCategoryPage).
  const { request: listingRequest, offset } = useProductListingSearch(categoryId ? Number(categoryId) : undefined)

  const { data: category, error: categoryError } = await useApi<ProductCategoryDetail>(
    `/api/products/categories/${categoryId}`,
    {
      key: `category${categoryId}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    },
  )

  if (!category.value) {
    // Normalize upstream 5xx to 503 (see products/[id]/[slug].vue):
    // temporary for crawlers + retryable by error.vue's one-shot reload.
    const upstreamStatus = categoryError.value?.statusCode ?? 404
    throw createError(
      upstreamStatus >= 500
        ? { statusCode: 503, message: t('error.service.unavailable') }
        : { statusCode: 404, message: t('error.page.not.found') },
    )
  }

  const { data: seoProducts } = await listingRequest

  const categoryName = computed(() =>
    extractTranslated(category.value, 'name', locale.value) ?? '',
  )

  // `undefined`, never '': an empty value still emits
  // `<meta name="description" content>`, which is strictly worse than no
  // tag at all (see blog/category/[id]/[slug].vue).
  //
  // Plain text: the description is the editor's rich text, and it feeds
  // both the meta tag and the excerpt under the title — which printed
  // "<p>Όλα όσα χρειάζεται…</p>" with its tags as text.
  const categoryDescription = computed(() =>
    htmlToPlainText(
      extractTranslated(category.value, 'seoDescription', locale.value)
      || extractTranslated(category.value, 'description', locale.value)
      || '',
    ) || undefined,
  )

  // ProductCategoryDetail has no image field — use the first product image
  // from the SEO prefetch if available, otherwise fall back to the
  // tenant's logo (matches setups.ts:17) so OG previews carry the tenant
  // brand, not the platform logo. Final fallback to the platform logo.
  const ogImage = computed(() => {
    const firstProduct = seoProducts.value?.results?.[0]
    if (firstProduct?.mainImagePath) {
      return img(firstProduct.mainImagePath, {
        ...OG_IMAGE_SIZE,
        fit: 'cover',
        format: 'png',
      }, {
        provider: 'mediaStream',
      })
    }
    return ogImageUrl.value
  })

  // Only the rendition has a known size; the logo fallback does not.
  const ogImageIsRendition = computed(() => !!seoProducts.value?.results?.[0]?.mainImagePath)

  // The canonical and the hreflang set are built from the entity's OWN
  // id+slug, never from route.path: the [slug] segment is decorative (the
  // id resolves the record), so /{id}/anything renders the same page and —
  // self-canonicalising — every variant became its own indexable URL.
  // Declaring the document (useDocumentLocales) hands that to
  // setupPageHeader, which names the locale each version really exists in;
  // a page writing its own canonical or hreflang is what pointed every
  // /en/** page at the Greek URL.
  declare(
    translatedLocales(category.value?.translations, 'name'),
    `/products/category/${category.value?.id}/${category.value?.slug}`,
  )

  // Prefer the merchant's own SEO title; otherwise qualify the bare
  // category name, which on its own ("Powerbank") is too thin to describe
  // the page in a result listing.
  const categoryDocumentTitle = computed(() => {
    const seoTitle = extractTranslated(category.value, 'seoTitle', locale.value)
    if (seoTitle) return seoTitle
    return categoryName.value
      ? t('page.title', { name: categoryName.value })
      : t('title')
  })

  useSeoMeta({
    title: () => categoryDocumentTitle.value,
    ogUrl: () => canonicalUrl.value,
    description: () => categoryDescription.value,
    ogTitle: () => categoryName.value || t('title'),
    ogDescription: () => categoryDescription.value,
    ogType: 'website',
    ogImage: () => ogImage.value,
    ogImageWidth: () => ogImageIsRendition.value ? OG_IMAGE_SIZE.width : undefined,
    ogImageHeight: () => ogImageIsRendition.value ? OG_IMAGE_SIZE.height : undefined,
    ogImageAlt: () => categoryName.value || t('title'),
  })

  itemListNode(baseUrl, () => categoryName.value || t('title'), seoProducts, offset)

  return { category, categoryName, categoryDescription }
}
