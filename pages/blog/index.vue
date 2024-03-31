<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useI18n()

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
          li: 'text-primary-800 dark:text-primary-100',
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
