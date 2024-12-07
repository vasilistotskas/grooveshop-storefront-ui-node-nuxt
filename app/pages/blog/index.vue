<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

const links = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('blog'),
    label: t('breadcrumb.items.blog.label'),
    current: true,
  },
])

useSeoMeta({
  description: t('description'),
  ogDescription: t('description'),
})
useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <UBreadcrumb
      :links="links"
      :ui="{
        li: 'text-primary-950 dark:text-primary-50',
        base: 'text-xs md:text-md',
      }"
      class="mb-5"
    />
    <BlogPostsList>
      <template #sidebar>
        <BlogTagsList />
      </template>
    </BlogPostsList>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Blog
  description: Ανακάλυψε τα τελευταία νέα και τις τεχνολογικές εξελίξεις στον κόσμο της τεχνολογίας.
  breadcrumb:
    items:
      blog:
        label: Blog
</i18n>
