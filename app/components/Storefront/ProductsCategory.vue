<script lang="ts" setup>
const { t } = useStoreI18n('components/Storefront/ProductsCategory')

const categoryId = useProductCategoryRouteId()

// The filters, chips and tree on this page are about this category.
const scope: ListingScope = { categoryId: categoryId ? Number(categoryId) : undefined, listingFilters: true }
provideListingScope(scope)
const { trail } = useCategoryForest(scope)

const { categoryName, categoryDescription } = await useProductCategoryPage(categoryId, t)

/**
 * Home → Products → each parent → this category. The tree's own trail
 * where it has one; before the categories arrive, the category alone.
 */
const breadcrumb = computed(() => [
  { label: t('products'), to: '/products' },
  ...(trail.value.length
    ? trail.value.map(node => ({ label: node.label, to: node.to }))
    : [{ label: categoryName.value }]),
])
</script>

<template>
  <div>
    <UContainer class="pt-5 pb-5 lg:pt-9 lg:pb-8">
      <PageBreadcrumb :items="breadcrumb" />
      <!-- The category's OWN name, which is the subject of the page. -->
      <ProductsHeader
        class="mt-3.5"
        :title="categoryName || t('title')"
        :description="categoryDescription"
      />
    </UContainer>

    <UContainer class="flex flex-col gap-4.5 pb-12 lg:gap-7 lg:pb-22">
      <ProductsCategoryChips />
      <ProductsBrowse />
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορία
  products: Προϊόντα
  page:
    title: "{name} — Αγορά online"
en:
  title: Category
  products: Products
  page:
    title: "{name} — buy online"
</i18n>
