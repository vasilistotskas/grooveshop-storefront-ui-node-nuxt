<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/Storefront/ProductsCategory')

const categoryId = useProductCategoryRouteId()
const { isMobileOrTablet } = useDevice()

// The filters, chips and tree on this page are about this category.
provideListingScope({ categoryId: categoryId ? Number(categoryId) : undefined })

// Ref to control the sidebar drawer
const sidebarRef = ref<{ toggleDrawer: () => void } | null>(null)

await useProductCategoryPage(categoryId, t)
</script>

<template>
  <WebsidePageWrapper class="flex flex-col">
    <WebsidePageTitle
      :text="t('title')"
      class="mb-4 capitalize"
    />
    <div
      class="flex gap-6"
      :class="{
        'flex-col': isMobileOrTablet,
        'flex-row': !isMobileOrTablet,
      }"
    >
      <WebsideProductsSidebar id="filters" ref="sidebarRef" />
      <WebsideProductsList
        v-if="categoryId"
        :category-id="Number(categoryId)"
        @toggle-filters="sidebarRef?.toggleDrawer()"
      />
    </div>
  </WebsidePageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορία
  page:
    title: "{name} — Αγορά online"
en:
  title: Category
  page:
    title: "{name} — buy online"
</i18n>
