<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'

const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

const seoMetaInput = {
  title: t('title'),
  description: t('description'),
  ogDescription: t('description'),
} satisfies UseSeoMetaInput

const links = computed(() => [
  {
    to: localePath('/'),
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to: localePath('/blog'),
    label: t('breadcrumb.items.blog.label'),
    current: true,
  },
])

useSeoMeta(seoMetaInput)

useHydratedHead({
  title: () => t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <PageBody>
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
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Blog
  description: Ανακάλυψε τα τελευταία νέα και τις τεχνολογικές εξελίξεις στον κόσμο της τεχνολογίας.
</i18n>
