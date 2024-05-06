<script lang="ts" setup>
const { locale } = useI18n()
const route = useRoute()

const categoryId = route.params.id

const { data: category } = await useFetch(
  `/api/blog/categories/${categoryId}`,
  {
    key: `category${categoryId}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
  },
)

if (!category.value) {
  throw createError({
    statusCode: 404,
    message: t('common.error.page.not.found'),
    fatal: true,
  })
}

const totalPosts = computed(() => category.value?.recursivePostCount || 0)

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <PageTitle :text="$t('pages.category.title')" class="capitalize" />
    <PageBody>
      <div>
        {{ totalPosts }}
      </div>
    </PageBody>
  </PageWrapper>
</template>
