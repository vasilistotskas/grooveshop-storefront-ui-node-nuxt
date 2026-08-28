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
    to: localePath('contact'),
    label: t('breadcrumb.items.contact.label'),
    icon: t('breadcrumb.items.contact.icon'),
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

// Optional per-tenant branded band above the page content — sections
// from the published 'contact' PageLayout. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('contact')
</script>

<template>
  <PageWrapper
    class="
      mx-auto flex max-w-2xl flex-col
      md:p-0!
    "
  >
    <!-- Breadcrumb ABOVE the branded band: with sections published the
         crumb otherwise landed mid-page, after the hours/map band. -->
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

    <ContactForm />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επικοινωνήστε μαζί μας
  breadcrumb:
    items:
      contact:
        label: Επικοινωνία
        icon: i-heroicons-chat-bubble-bottom-center-text
</i18n>
