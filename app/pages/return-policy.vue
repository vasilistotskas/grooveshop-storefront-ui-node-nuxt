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
    to: localePath('return-policy'),
    label: t('breadcrumb.items.return-policy.label'),
    icon: t('breadcrumb.items.return-policy.icon'),
    current: true,
  },
])

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
  <PageWrapper class="container flex flex-col">
    <UBreadcrumb
      :links="links"
      :ui="{
        li: 'text-primary-950 dark:text-primary-50',
        base: 'text-xs md:text-md',
      }"
      class="container-xs relative mb-5 min-w-0"
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
  title: Πολιτική Επιστροφών
  breadcrumb:
    items:
      return-policy:
        label: Πολιτική Επιστροφών
        icon: i-heroicons-clipboard-document-list
</i18n>
