<script lang="ts" setup>
const { t } = useI18n()
const { isMobileOrTablet } = useDevice()

// Ref to control the sidebar drawer
const sidebarRef = ref<{ toggleDrawer: () => void } | null>(null)

await useProductsIndexPage(t)

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
  <WebsidePageWrapper class="flex flex-col">
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
    <WebsidePageTitle
      v-if="!sectionsProvideHeading(brandSections)"
      :text="t('title')"
      class="sr-only"
    />
    <WebsidePageBreadcrumb />
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
    <WebsideProductCategoriesNav />

    <div
      class="flex gap-6"
      :class="{
        'flex-col': isMobileOrTablet,
        'flex-row': !isMobileOrTablet,
      }"
    >
      <WebsideProductsSidebar id="filters" ref="sidebarRef" />
      <WebsideProductsList id="main-content" @toggle-filters="handleToggleFilters" />
    </div>
  </WebsidePageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προϊόντα
  skip_to_content: Μετάβαση στο περιεχόμενο
  skip_to_filters: Μετάβαση στα φίλτρα
  seo:
    # Tenant-NEUTRAL, both of these: they ship to every storefront, so
    # they must not name a product domain. The previous description
    # advertised "μουσικών οργάνων" on a shop that sells neither musical
    # instruments nor anything like them.
    title: "Προϊόντα: Όλη η συλλογή"
    description: Δες όλα τα προϊόντα μας, με φίλτρα κατηγορίας, τιμής και χαρακτηριστικών για να βρεις γρήγορα αυτό που ψάχνεις.
en:
  title: Products
  skip_to_content: Skip to the content
  skip_to_filters: Skip to the filters
  seo:
    title: "Products: the whole range"
    description: Browse all of our products, with category, price and attribute filters to find what you are looking for quickly.
</i18n>
