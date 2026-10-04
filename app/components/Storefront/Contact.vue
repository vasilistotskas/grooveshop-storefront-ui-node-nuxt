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

// A layout that already carries the opening hours would show them twice.
const layoutHasHours = computed(() =>
  brandSections.value.some(section => section.componentType === 'business_hours'),
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
        <PageBreadcrumb class="mb-5" />
      </UContainer>
    </template>
    <template #after>
      <!-- Skipped entirely when the tenant's layout carries its own
           enquiry form (`contact_panel`): the visitor would otherwise
           be offered the same form twice, the second time without the
           subject and the offices the design asks for. -->
      <PageSectionBand
        v-if="!sectionsProvideForm(brandSections)"
        :surface="surface"
      >
        <header
          v-if="!sectionsProvideHeading(brandSections)"
          class="mb-8 flex flex-col gap-2"
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
          <p class="max-w-2xl text-toned">
            {{ t('lead') }}
          </p>
        </header>

        <div
          class="
            grid gap-6
            lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start
          "
        >
          <ContactForm />

          <div class="flex flex-col gap-6">
            <ContactMethodsCard />
            <ContactHoursCard v-if="!layoutHasHours" />
          </div>
        </div>
      </PageSectionBand>
    </template>
  </PageSectionsShell>
</template>

<i18n lang="yaml">
el:
  title: Επικοινωνήστε μαζί μας
  heading: Μίλα με έναν άνθρωπο
  lead: Πες μας τι χρειάζεσαι και θα σου απαντήσουμε με email.
en:
  title: Contact us
  heading: Talk to a human
  lead: Tell us what you need and we will reply by email.
</i18n>
