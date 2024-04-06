<script lang="ts" setup>
const { locale } = useI18n()
const route = useRoute('products-category-id-slug___en')

const categoryId = route.params.id

const { data: category } = await useFetch(
  `/api/products/categories/${categoryId}`,
  {
    key: `category${categoryId}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
  },
)

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
