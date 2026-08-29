<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})

// Optional per-tenant branded band above the page content — sections
// from the published 'contact' PageLayout. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('contact')
</script>

<template>
  <PageWrapper class="flex flex-col">
    <!-- Breadcrumb ABOVE the branded band: with sections published the
         crumb otherwise landed mid-page, after the hours/map band. -->
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
    <!-- The FORM is what wants a narrow measure — not the page. The
         constraint used to sit on PageWrapper, which also squeezed the
         breadcrumb and the branded band to 2xl and left this page
         visibly narrower than every other one. -->
    <div class="mx-auto w-full max-w-2xl">
      <PageTitle
        v-if="!sectionsProvideHeading(brandSections)"
        :text="t('title')"
        class="mb-4 text-center capitalize"
      />

      <ContactForm />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επικοινωνήστε μαζί μας
</i18n>
