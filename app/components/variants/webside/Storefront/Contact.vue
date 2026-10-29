<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/Storefront/Contact')

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

// Optional per-tenant branded band above the page content — sections
// from the published 'contact' PageLayout. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await usePageConfig('contact')
</script>

<template>
  <WebsidePageSectionsShell :sections="brandSections">
    <template #title>
      <!-- Above the branded band: with sections published the crumb
           otherwise landed mid-page, after the hours/map band. -->
      <WebsidePageBreadcrumb />
    </template>
    <template #after>
      <!-- The FORM is what wants a narrow measure — not the page. The
           constraint used to sit on PageWrapper, which also squeezed
           the breadcrumb and the branded band to 2xl and left this
           page visibly narrower than every other one.
           Skipped entirely when the tenant's layout carries its own
           enquiry form (`contact_panel`): the visitor would otherwise
           be offered the same form twice, the second time without the
           subject and the offices the design asks for. -->
      <div
        v-if="!sectionsProvideForm(brandSections)"
        class="mx-auto w-full max-w-2xl"
      >
        <WebsidePageTitle
          v-if="!sectionsProvideHeading(brandSections)"
          :text="t('title')"
          class="mb-4 text-center capitalize"
        />

        <WebsideContactForm />
      </div>
    </template>
  </WebsidePageSectionsShell>
</template>

<i18n lang="yaml">
el:
  title: Επικοινωνήστε μαζί μας
en:
  title: Contact us
</i18n>
