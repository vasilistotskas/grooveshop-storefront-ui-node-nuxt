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
  middleware: ['feedback-enabled'],
})

// Optional per-tenant branded band above the form — sections from a
// published 'feedback' PageLayout. Fallback is EMPTY, so tenants without
// a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('feedback')
</script>

<template>
  <PageWrapper class="flex flex-col">
    <!-- Breadcrumb ABOVE the branded band (crumb landed mid-page for
         tenants with published sections). -->
    <PageBreadcrumb />
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
    <!-- Narrow measure belongs to the FORM, not the page frame (see
         contact.vue) — on PageWrapper it also squeezed the breadcrumb
         and the branded band. -->
    <div class="mx-auto w-full max-w-(--container-4xl)">
      <PageTitle
        :text="t('title')"
        class="mb-4 text-center capitalize"
      />

      <FeedbackForm />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Σχόλια & Παρατηρήσεις
</i18n>
