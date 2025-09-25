<script lang="ts" setup>
const { t, locale } = useI18n()
const route = useRoute()

const categoryId = 'id' in route.params
  ? route.params.id
  : undefined

const { data: category } = await useFetch(
  `/api/products/categories/${categoryId}`,
  {
    key: `category${categoryId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)

if (!category.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
    fatal: true,
  })
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <PageTitle
      :text="t('title')"
      class="capitalize"
    />

    <div v-if="category" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορία
</i18n>
