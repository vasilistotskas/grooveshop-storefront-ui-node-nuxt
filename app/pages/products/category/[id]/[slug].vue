<script lang="ts" setup>
const { t, locale } = useI18n()
const route = useRoute(`products-category-id-slug___${locale.value}`)
const img = useMediaStreamImage()
const siteConfig = useSiteConfig()
const { ogImageUrl } = useTenantBranding()

const categoryId = 'id' in route.params
  ? route.params.id
  : undefined

const { data: category, error: categoryError } = await useFetch<ProductCategoryDetail>(
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

// Lightweight first-page fetch for Schema.org ItemList.
// Server-side only — does NOT duplicate the full ProductsList fetch.
// When more locales activate, replace hardcoded 'el' with SUPPORTED_LOCALES iteration.
const { data: seoProducts } = await useFetch<ProductMeiliSearchResponse>(
  '/api/products/search',
  {
    key: `category-seo-products-${categoryId}`,
    query: { languageCode: locale, categories: categoryId, limit: 12, offset: 0 },
    server: true,
    lazy: false,
  },
)

const categoryName = computed(() =>
  extractTranslated(category.value, 'name', locale.value) ?? '',
)

// `undefined`, never '': an empty value still emits
// `<meta name="description" content>`, which is strictly worse than no
// tag at all (see blog/category/[id]/[slug].vue).
const categoryDescription = computed(() =>
  category.value?.seoDescription
  || extractTranslated(category.value, 'description', locale.value)
  || undefined,
)

// ProductCategoryDetail has no image field — use the first product image
// from the SEO prefetch if available, otherwise fall back to the
// tenant's logo (matches setups.ts:17) so OG previews carry the tenant
// brand, not the platform logo. Final fallback to the platform logo.
const ogImage = computed(() => {
  const firstProduct = seoProducts.value?.results?.[0]
  if (firstProduct?.mainImagePath) {
    return img(firstProduct.mainImagePath, {
      width: 1200,
      height: 630,
      fit: 'cover',
      format: 'png',
    }, {
      provider: 'mediaStream',
    })
  }
  return ogImageUrl.value
})

const baseUrl = siteConfig.url

// Canonical is built from the entity's OWN id+slug, never from
// route.path: the [slug] segment is decorative (the id resolves the
// record), so /{id}/anything renders the same page and — self-
// canonicalising — every variant became its own indexable URL, an
// unbounded duplicate-content surface. products/[id]/[slug].vue
// already does this; these routes were the ones that did not.
const canonicalUrl = computed(
  () => `${baseUrl}/products/category/${category.value?.id}/${category.value?.slug}`,
)

useSeoMeta({
  title: () => categoryName.value || t('title'),
  ogUrl: () => canonicalUrl.value,
  description: () => categoryDescription.value,
  ogTitle: () => categoryName.value || t('title'),
  ogDescription: () => categoryDescription.value,
  ogType: 'website',
  ogImage: () => ogImage.value,
  ogImageAlt: () => categoryName.value || t('title'),
})

useHead({
  link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
})

useSchemaOrg([
  defineWebPage({ '@type': 'CollectionPage' }),
  // itemListElement is object-typed, so it can no longer be a getter
  // since the @unhead/schema-org v3 definer-type rewrite — the whole
  // node is a single computed() instead.
  defineItemList(computed(() => ({
    name: categoryName.value || t('title'),
    itemListElement: (seoProducts.value?.results ?? []).map((p, i) => ({
      '@type': 'ListItem' as const,
      'position': i + 1,
      'url': `${baseUrl}/products/${p.master ?? p.id}/${p.slug}`,
      'name': p.name,
    })),
  }))),
])

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <PageTitle
      :text="t('title')"
      class="mb-4 capitalize"
    />
    <ProductsList v-if="categoryId" :category-id="Number(categoryId)" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορία
</i18n>
