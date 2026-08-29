<script lang="ts" setup>
const { t, locale } = useI18n()
const { isMobileOrTablet } = useDevice()
const siteConfig = useSiteConfig()
const { ogImageUrl } = useTenantBranding()

// Ref to control the sidebar drawer
const sidebarRef = ref<{ toggleDrawer: () => void } | null>(null)

// Lightweight first-page fetch for Schema.org ItemList.
// Server-side only (server: true is the default) — this does NOT duplicate
// the full ProductsList fetch; it fetches page-1 with a small limit purely
// for structured-data purposes. When more locales activate, replace the
// hardcoded 'el' with iteration over SUPPORTED_LOCALES.
const { data: seoProducts } = await useFetch<ProductMeiliSearchResponse>(
  '/api/products/search',
  {
    key: 'products-index-seo',
    query: { languageCode: locale, limit: 12, offset: 0 },
    server: true,
    lazy: false,
  },
)

useSeoMeta({
  // seo.title, not title: `title` is also the page's h1 (see /blog).
  title: () => t('seo.title'),
  description: () => t('seo.description'),
  ogTitle: () => t('seo.title'),
  ogDescription: () => t('seo.description'),
  ogType: 'website',
  // Prefer the tenant's light-mode logo for OG meta so social previews
  // carry the tenant's brand. ``setups.ts`` uses the same pattern
  // (H14 in MULTI_TENANT_AUDIT.md).
  ogImage: ogImageUrl.value,
  ogImageAlt: () => t('title'),
})

const baseUrl = siteConfig.url

useSchemaOrg([
  defineWebPage({ '@type': 'CollectionPage' }),
  // itemListElement is object-typed, so it can no longer be a getter
  // since the @unhead/schema-org v3 definer-type rewrite — the whole
  // node is a single computed() instead.
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

definePageMeta({
  layout: 'default',
})

// Handle filter toggle from Toolbar
const handleToggleFilters = () => {
  sidebarRef.value?.toggleDrawer()
}

// Optional per-tenant branded band above the page content — sections
// from the published 'products' PageLayout. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('products')
</script>

<template>
  <PageWrapper class="flex flex-col">
    <!-- Skip Links for Keyboard Navigation -->
    <div class="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        class="
          skip-link
          fixed top-4 left-4 z-50
          bg-primary text-white
          px-4 py-2 rounded-lg
          font-semibold
          transition-all
        "
      >
        {{ t('skip_to_content') }}
      </a>
      <a
        href="#filters"
        class="
          skip-link
          fixed top-4 left-32 z-50
          bg-primary text-white
          px-4 py-2 rounded-lg
          font-semibold
          transition-all
        "
      >
        {{ t('skip_to_filters') }}
      </a>
    </div>

    <!-- Every page owns exactly one h1. Visually hidden because the
         design has no heading slot here — the navbar logo used to
         supply the h1, which put the store name in the h1 of several
         unrelated URLs. -->
    <PageTitle
      v-if="!sectionsProvideHeading(brandSections)"
      :text="t('title')"
      class="sr-only"
    />
    <PageBreadcrumb />
    <div
      v-if="brandSections.length"
      class="
        mb-8 grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in brandSections"
        :key="section.uuid"
        :section="section"
      />
    </div>

    <!-- The only internal link into /products/category/**. Without it
         those pages sit in the sitemap with zero inbound links. -->
    <ProductCategoriesNav />

    <div
      class="flex gap-6"
      :class="{
        'flex-col': isMobileOrTablet,
        'flex-row': !isMobileOrTablet,
      }"
    >
      <ProductsSidebar id="filters" ref="sidebarRef" />
      <ProductsList id="main-content" @toggle-filters="handleToggleFilters" />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προϊόντα
  skip_to_content: Μετάβαση στο περιεχόμενο
  skip_to_filters: Μετάβαση στα φίλτρα
  seo:
    title: Προϊόντα και gadgets τεχνολογίας
    # The catalogue is tech accessories, not musical instruments — the
    # previous copy was template boilerplate that shipped to every
    # tenant's /products description.
    description: Δες όλα τα προϊόντα και gadgets τεχνολογίας, με φίλτρα κατηγορίας, τιμής και χαρακτηριστικών για να βρεις γρήγορα αυτό που ψάχνεις.
</i18n>
