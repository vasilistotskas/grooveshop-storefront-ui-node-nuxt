<script lang="ts" setup>
const route = useRoute('blog-category-id-slug___en')

const categoryId = route.params.id

const { data: category } = await useFetch(
  `/api/blog/categories/${categoryId}`,
  {
    key: `category${categoryId}`,
    method: 'GET',
  },
)

const totalPosts = computed(() => category.value?.recursivePostCount || 0)

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
