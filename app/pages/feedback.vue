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
  middleware: ['feedback-enabled'],
})

// Optional per-tenant branded band above the form — sections from a
// published 'feedback' PageLayout. Fallback is EMPTY, so tenants without
// a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('feedback')
</script>

<template>
  <PageWrapper class="mx-auto flex max-w-(--container-4xl) flex-col">
    <!-- Breadcrumb ABOVE the branded band (crumb landed mid-page for
         tenants with published sections). -->
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
      class="relative mb-5 min-w-0"
    />
    <div
      v-if="brandSections.length"
      class="
        mb-8 grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in brandSections"
        :key="section.uuid"
        :section="section"
      />
    </div>
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />

    <FeedbackForm />
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
