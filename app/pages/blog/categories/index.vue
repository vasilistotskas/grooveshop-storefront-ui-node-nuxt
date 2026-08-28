<script lang="ts" setup>
const { t } = useI18n()

useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
  middleware: ['blog-enabled'],
})
</script>

<template>
  <PageWrapper class="flex flex-col">
    <PageBreadcrumb />
    <BlogCategoriesList class="w-full" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κατηγορίες
</i18n>
