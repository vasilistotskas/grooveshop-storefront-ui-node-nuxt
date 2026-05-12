<script lang="ts" setup>
const { t, locale } = useI18n()
const route = useRoute(`products-category-id-slug___${locale.value}`)
const config = useRuntimeConfig()
const img = useImage()
const siteConfig = useSiteConfig()
const tenantStore = useTenantStore()

const categoryId = 'id' in route.params
  ? route.params.id
  : undefined

const { data: category } = await useFetch<ProductCategoryDetail>(
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
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
  })
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

const categoryDescription = computed(() =>
  category.value?.seoDescription
  || extractTranslated(category.value, 'description', locale.value)
  || '',
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
  return tenantStore.logoLightUrl || (config.public.appLogo as string)
})

const baseUrl = siteConfig.url

useSeoMeta({
  title: () => categoryName.value || t('title'),
  description: () => categoryDescription.value,
  ogTitle: () => categoryName.value || t('title'),
  ogDescription: () => categoryDescription.value,
  ogType: 'website',
  ogImage: () => ogImage.value,
  ogImageAlt: () => categoryName.value || t('title'),
})

useSchemaOrg([
  defineWebPage({ '@type': 'CollectionPage' }),
  defineItemList({
    name: () => categoryName.value || t('title'),
    itemListElement: () => (seoProducts.value?.results ?? []).map((p, i) => ({
      '@type': 'ListItem' as const,
      'position': i + 1,
      'url': `${baseUrl}/products/${p.master ?? p.id}/${p.slug}`,
      'name': p.name,
    })),
  }),
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
