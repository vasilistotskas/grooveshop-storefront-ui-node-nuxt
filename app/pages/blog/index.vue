<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
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
  <PageWrapper class="flex flex-col">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-md',
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
