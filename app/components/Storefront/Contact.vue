<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

// Optional per-tenant branded band above the page content — sections
// from the published 'contact' PageLayout. Fallback is EMPTY, so a
// tenant without a layout gets the form alone.
const { sections: brandSections } = await usePageConfig('contact')

/**
 * The page's own content is a BAND like every section above it, so it
 * paints the surface opposite whatever the layout ends on rather than
 * floating in the page's gutter. With no sections at all it is the
 * only band, and the ground is right.
 */
const surface = computed<'default' | 'muted'>(() =>
  brandSections.value.length % 2 === 0 ? 'default' : 'muted',
)

/**
 * A layout that opens with its own hero has no room above it for a
 * breadcrumb: the hero IS the top of the page and owns its `<h1>`. The
 * rule reads the SECTIONS rather than the tenant — a hardcoded list of
 * schemas would have to be edited every time a store adopts a hero.
 */
const showBreadcrumb = computed(
  () => !sectionsProvideHeading(brandSections.value),
)
</script>

<template>
  <PageSectionsShell :sections="brandSections">
    <template #title>
      <!-- Above the branded band: with sections published the crumb
           otherwise landed mid-page, after the hours/map band. It needs
           the content frame of its own, because the stack under it is
           full-width bands that each carry theirs. -->
      <UContainer
        v-if="showBreadcrumb"
        class="pt-6"
      >
        <PageBreadcrumb />
      </UContainer>
    </template>
    <template #after>
      <!-- The FORM is what wants a narrow measure — not the page. The
           constraint used to sit on PageWrapper, which also squeezed
           the breadcrumb and the branded band and left this page
           visibly narrower than every other one.
           Skipped entirely when the tenant's layout carries its own
           enquiry form (`contact_panel`): the visitor would otherwise
           be offered the same form twice, the second time without the
           subject and the offices the design asks for. -->
      <PageSectionBand
        v-if="!sectionsProvideForm(brandSections)"
        :surface="surface"
      >
        <div class="mx-auto w-full max-w-2xl">
          <PageTitle
            v-if="!sectionsProvideHeading(brandSections)"
            :text="t('title')"
            class="mb-4 text-center capitalize"
          />

          <ContactForm />
        </div>
      </PageSectionBand>
    </template>
  </PageSectionsShell>
</template>

<i18n lang="yaml">
el:
  title: Επικοινωνήστε μαζί μας
en:
  title: Contact us
</i18n>
