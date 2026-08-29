<script lang="ts" setup>
const { t } = useI18n()

useHead({
  // seo.title, not title: `title` is also the page's h1 (see /blog).
  title: t('seo.title'),
})

definePageMeta({
  layout: 'default',
  middleware: ['blog-enabled'],
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <!-- Every page owns exactly one h1. This one is visually hidden
         because the design has no heading slot here — the navbar logo
         used to supply the h1, which put the store name in the h1 of
         several unrelated URLs. -->
    <PageTitle
      :text="t('title')"
      class="sr-only"
    />
    <PageBreadcrumb />
    <BlogCategoriesList class="w-full" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορίες
  seo:
    title: Κατηγορίες άρθρων και οδηγών
</i18n>
