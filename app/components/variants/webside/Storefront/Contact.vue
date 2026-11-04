<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/Storefront/Contact')

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

// Optional per-tenant branded band above the page content — sections
// from the published 'contact' builder page. Fallback is EMPTY, so pages
// without a layout render exactly as before.
const { sections: brandSections } = await useBuilderPage('contact')

// The side cards (phone, email, offices, opening hours) are the merchant's
// own data. With none to show the form keeps the page to itself, centred;
// with any it shares the row from `lg` up. A layout that already carries the
// opening hours would show them twice.
const { hasAny: hasMethods } = useContactMethods()
const { hasData: hasHours } = useBusinessHours()
const layoutHasHours = computed(() => sectionsProvideHours(brandSections.value))
const showHours = computed(() => hasHours.value && !layoutHasHours.value)
const hasSide = computed(() => hasMethods.value || showHours.value)
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
        class="mx-auto w-full"
        :class="hasSide ? 'max-w-5xl' : 'max-w-2xl'"
      >
        <WebsidePageTitle
          v-if="!sectionsProvideHeading(brandSections)"
          :text="t('title')"
          class="mb-4 text-center capitalize"
        />

        <div
          class="grid grid-cols-1 gap-6"
          :class="hasSide && `
            lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start
          `"
        >
          <WebsideContactForm />

          <!-- The form's own frame (`container`, its `sm:px-6`, a card at most
               `max-w-xl`), so below `lg` the cards line up with the form above
               them; from `lg` they fill the column beside it, level with the
               form card (which sits under its `sm:py-6`). -->
          <div
            v-if="hasSide"
            class="
              container mx-auto
              sm:px-6
              lg:px-0 lg:pt-6
            "
          >
            <div class="mx-auto flex max-w-xl flex-col gap-6 lg:max-w-none">
              <WebsideContactMethodsCard />
              <WebsideContactHoursCard v-if="!layoutHasHours" />
            </div>
          </div>
        </div>
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
