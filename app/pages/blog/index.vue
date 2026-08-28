<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()

const items = computed(() => [
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
  middleware: ['blog-enabled'],
})

// Optional per-tenant branded band above the page content — sections
// from the published 'blog' PageLayout. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('blog')
</script>

<template>
  <PageWrapper class="flex flex-col">
    <PageSectionRenderer
      v-for="section in brandSections"
      :key="section.uuid"
      :section="section"
    />
    <UBreadcrumb
      :items="items"
      :ui="{
        item: `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          text-xs
          md:text-base
        `,
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
  description: Νέα, άρθρα και ιστορίες μας.
  breadcrumb:
    items:
      blog:
        label: Blog
</i18n>
