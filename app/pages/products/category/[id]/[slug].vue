<script lang="ts" setup>
const { t, locale } = useI18n()
const route = useRoute(`products-category-id-slug___${locale.value}`)

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

const categoryName = computed(() =>
  extractTranslated(category.value, 'name', locale.value) ?? '',
)

const categoryDescription = computed(() =>
  category.value?.seoDescription
  || extractTranslated(category.value, 'description', locale.value)
  || '',
)

useSeoMeta({
  title: () => categoryName.value || t('title'),
  description: () => categoryDescription.value,
  ogTitle: () => categoryName.value || t('title'),
  ogDescription: () => categoryDescription.value,
  ogType: 'website',
})

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
