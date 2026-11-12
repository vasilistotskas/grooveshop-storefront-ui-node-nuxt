<script lang="ts" setup>
/**
 * The store's shopping promises as a band: delivery, free shipping, returns
 * and the ways to pay, each from data the store already publishes
 * (`useStoreAssurances`, which reads the facts the product page's assurances
 * read). A promise the store has not made is left out, and the band draws
 * nothing when none is left, so a store with no shipping data gets no empty
 * strip.
 *
 * Without a heading the list still has a name, so a screen reader announces
 * what the four lines are.
 */
withDefaults(defineProps<{
  heading?: string
  surface?: 'default' | 'muted'
}>(), {
  surface: 'default',
})

const { t } = useStoreI18n('components/PageSection/StoreAssurances')
const { rows } = await useStoreAssurances()

/**
 * One row on a desk, as many columns as there are promises, so three fill
 * the row instead of leaving a gap. Literal classes so Tailwind sees them.
 */
const DESK_COLUMNS = [
  'lg:grid-cols-1',
  'lg:grid-cols-2',
  'lg:grid-cols-3',
  'lg:grid-cols-4',
] as const
</script>

<template>
  <PageSectionBand
    v-if="rows.length"
    :heading="heading"
    :surface="surface"
    padding="sm"
  >
    <UPageGrid
      as="ul"
      :aria-label="heading ? undefined : t('label')"
      :class="[
        `
          grid-cols-2 gap-x-4 gap-y-6
          lg:gap-8
        `,
        DESK_COLUMNS[Math.min(rows.length, DESK_COLUMNS.length) - 1],
      ]"
    >
      <UPageFeature
        v-for="row in rows"
        :key="row.kind"
        as="li"
        :icon="row.icon"
        :title="row.title"
        :description="row.note"
        :to="row.to"
        orientation="vertical"
        :ui="{
          leading: 'size-11 rounded-md bg-secondary/10',
          leadingIcon: 'size-5.5 text-accent',
          title: `
            text-sm/snug
            lg:text-base/snug
          `,
          description: 'text-[0.8125rem]/snug',
        }"
      />
    </UPageGrid>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  label: Αγορές με σιγουριά
en:
  label: Shopping with confidence
</i18n>
