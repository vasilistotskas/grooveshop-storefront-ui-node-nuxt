<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/Storefront/ProductsCategory')

const categoryId = useProductCategoryRouteId()

await useProductCategoryPage(categoryId, t)
</script>

<template>
  <WebsidePageWrapper class="flex flex-col">
    <WebsidePageTitle
      :text="t('title')"
      class="mb-4 capitalize"
    />
    <WebsideProductsList v-if="categoryId" :category-id="Number(categoryId)" />
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
