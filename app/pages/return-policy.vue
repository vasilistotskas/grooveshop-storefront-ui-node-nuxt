<script lang="ts" setup>
const { t } = useI18n()

defineRouteRules({
  robots: false,
})

useSeoMeta({
  title: t('title'),
})

useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <!-- Same frame as its sibling legal pages (privacy / terms /
       cookies); the 4xl cap put this page's crumb 272px right of
       theirs. -->
  <PageWrapper class="flex flex-col">
    <PageBreadcrumb />
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />

    <div />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Πολιτική Επιστροφών
</i18n>
