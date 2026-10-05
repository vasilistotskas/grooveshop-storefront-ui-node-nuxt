<script lang="ts" setup>
const { t, locale } = useI18n()
const siteConfig = useSiteConfig()
const { ogImageUrl } = useTenantBranding()

// The whole store: no category narrows the filters, chips or tree.
provideListingScope({ categoryId: undefined, listingFilters: true })

// A small page-1 fetch for the Schema.org ItemList. It does NOT
// duplicate the listing's own fetch — different limit, different key —
// and exists only so the collection is machine-readable.
const { data: seoProducts } = await useApi<ProductMeiliSearchResponse>(
  '/api/products/search',
  {
    key: 'products-index-seo',
    query: { languageCode: locale, limit: 12, offset: 0 },
    server: true,
    lazy: false,
  },
)

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

const baseUrl = siteConfig.url

useSchemaOrg([
  defineWebPage({ '@type': 'CollectionPage' }),
  // `itemListElement` is object-typed, so it cannot be a getter since
  // the @unhead/schema-org v3 definer-type rewrite — the whole node is
  // one computed instead.
  defineItemList(computed(() => ({
    name: t('title'),
    itemListElement: (seoProducts.value?.results ?? []).map((p, i) => ({
      '@type': 'ListItem' as const,
      'position': i + 1,
      'url': `${baseUrl}/products/${p.master ?? p.id}/${p.slug}`,
      'name': p.name,
    })),
  }))),
])

// Optional per-tenant branded band above the page content — sections
// from the published 'products' PageLayout. The fallback is EMPTY, so a
// tenant without one gets the listing alone.
const { sections: brandSections } = await usePageConfig('products')
</script>

<template>
  <div>
    <a
      href="#product-results"
      class="
        sr-only
        focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50
        focus:rounded-md focus:bg-inverted focus:px-4 focus:py-2
        focus:font-medium focus:text-inverted
      "
    >
      {{ t('skip_to_content') }}
    </a>

    <UContainer class="pt-5 lg:pt-9">
      <PageBreadcrumb />
    </UContainer>

    <!-- The store's own branded sections, under the crumb and above the
         listing; their heading, when they carry one, is the page's. -->
    <PageSectionRenderer
      v-for="section in brandSections"
      :key="section.uuid"
      :section="section"
    />

    <UContainer class="pt-3.5 pb-5 lg:pb-8">
      <ProductsHeader
        :title="sectionsProvideHeading(brandSections) ? undefined : t('title')"
        :description="t('seo.description')"
      />
    </UContainer>

    <!-- The chips and the tree are the internal links into
         /products/category/**; without them those pages sit in the
         sitemap with no inbound link at all. -->
    <UContainer class="flex flex-col gap-4.5 pb-12 lg:gap-7 lg:pb-22">
      <ProductsCategoryChips />
      <ProductsBrowse />
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Προϊόντα
  skip_to_content: Μετάβαση στα αποτελέσματα
  seo:
    # Tenant-NEUTRAL, both of these: they ship to every storefront, so
    # neither may name a product domain. The previous description
    # advertised musical instruments on a shop that sells nothing like
    # them.
    title: "Προϊόντα: Όλη η συλλογή"
    description: Δες όλα τα προϊόντα μας, με φίλτρα κατηγορίας, τιμής και χαρακτηριστικών για να βρεις γρήγορα αυτό που ψάχνεις.
en:
  title: Products
  skip_to_content: Skip to the results
  seo:
    title: "Products: the whole range"
    description: Browse all of our products, with category, price and attribute filters to find what you are looking for quickly.
</i18n>
