<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'

const config = useRuntimeConfig()
const { t, locale } = useI18n()

const seoMetaOptions = {
  title: t('pages.blog.title'),
} satisfies UseSeoMetaInput

const links = [
  {
    to: locale.value === config.public.defaultLocale ? '/' : `/${locale.value}`,
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to:
      locale.value === config.public.defaultLocale
        ? '/blog'
        : `/${locale.value}/blog`,
    label: t('breadcrumb.items.blog.label'),
    current: true,
  },
]

useHydratedHead({
  title: () => t('pages.blog.title'),
})
useSeoMeta(seoMetaOptions)

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <PageBody>
      <UBreadcrumb
        :links="links"
        class="mb-5"
        :ui="{
          li: 'text-primary-950 dark:text-primary-50',
          base: 'text-xs md:text-md',
        }"
      />
      <BlogPostsList>
        <template #sidebar>
          <BlogTagsList />
        </template>
      </BlogPostsList>
    </PageBody>
  </PageWrapper>
</template>
