<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('title'),
})

useHead({
  title: t('title'),
})

// Optional per-tenant branded band above the form — sections from a
// published 'feedback' PageLayout. Fallback is EMPTY, so tenants without
// a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('feedback')
</script>

<template>
  <PageWrapper class="flex flex-col gap-6">
    <!-- Breadcrumb ABOVE the branded band (crumb landed mid-page for
         tenants with published sections). -->
    <PageBreadcrumb />
    <div
      v-if="brandSections.length"
      class="
        grid gap-6
        md:gap-10
      "
    >
      <PageSectionRenderer
        v-for="section in brandSections"
        :key="section.uuid"
        :section="section"
      />
    </div>

    <!-- The narrow measure belongs to the form, not the page frame. -->
    <div class="flex w-full max-w-3xl flex-col gap-6">
      <header
        v-if="!sectionsProvideHeading(brandSections)"
        class="flex flex-col gap-2"
      >
        <h1
          class="
            font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[2.25rem]/[1.1]
          "
        >
          {{ t('heading') }}
        </h1>
        <p class="text-toned">
          {{ t('lead') }}
        </p>
      </header>

      <FeedbackForm />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Σχόλια & Παρατηρήσεις
  heading: Πώς τα πήγαμε;
  lead: Πέντε σύντομες ερωτήσεις.
en:
  title: Feedback & Comments
  heading: How did we do?
  lead: Five short questions.
</i18n>
