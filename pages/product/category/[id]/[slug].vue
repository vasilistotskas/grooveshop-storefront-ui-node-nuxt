<script lang="ts" setup>
const route = useRoute('product-category-id-slug___en')

const categoryId = route.params.id

await useFetch(`/api/products/categories/${categoryId}`, {
  key: `category${categoryId}`,
  method: 'GET',
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <PageHeader>
      <PageTitle :text="$t('pages.category.title')" class="capitalize" />
    </PageHeader>
    <PageBody>
      <div />
    </PageBody>
  </PageWrapper>
</template>
