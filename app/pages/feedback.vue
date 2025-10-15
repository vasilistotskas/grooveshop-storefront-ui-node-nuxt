<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('feedback'),
    label: t('breadcrumb.items.feedback.label'),
    icon: t('breadcrumb.items.feedback.icon'),
    current: true,
  },
])

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
  <PageWrapper class="mx-auto flex max-w-(--container-4xl) flex-col">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-base',
      }"
      class="relative mb-5 min-w-0"
    />
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />

    <div />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Σχόλια & Παρατηρήσεις
  breadcrumb:
    items:
      feedback:
        label: Σχόλια & Παρατηρήσεις
        icon: i-heroicons-chat-bubble-left-right
</i18n>
