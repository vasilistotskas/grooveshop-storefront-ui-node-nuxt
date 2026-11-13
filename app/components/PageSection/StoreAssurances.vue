<script lang="ts" setup>
/**
 * The store's shopping promises as a band: delivery, free shipping, returns
 * and the ways to pay, each from data the store already publishes
 * (`useStoreAssurances`, which reads the facts the product page's assurances
 * read). A promise the store has not made is left out, and the band draws
 * nothing when none is left, so a store with no shipping data gets no empty
 * strip.
 *
 * `layout: 'card'` draws the promises on one raised card instead, risen 36px
 * over the bottom edge of the band above it on a desk (the hero it follows),
 * each promise a column with its icon beside the words; on a phone a
 * two-by-two grid of small bordered cards, the icon over the words. It has no
 * heading row: the card is the whole section.
 *
 * Without a heading the list still has a name, so a screen reader announces
 * what the four lines are.
 */
withDefaults(defineProps<{
  heading?: string
  surface?: 'default' | 'muted'
  layout?: 'card'
}>(), {
  surface: 'default',
  layout: undefined,
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
  <section
    v-if="rows.length && layout === 'card'"
    :aria-label="heading || t('label')"
    class="
      relative z-10 w-full pt-5
      lg:-mt-9 lg:pt-0
    "
  >
    <UContainer>
      <ul
        class="
          grid grid-cols-2 gap-2
          lg:gap-1 lg:rounded-xl lg:border lg:border-default lg:bg-default
          lg:p-2 lg:shadow-[0_8px_24px_rgb(0_0_0/0.06)]
        "
        :class="DESK_COLUMNS[Math.min(rows.length, DESK_COLUMNS.length) - 1]"
      >
        <li
          v-for="row in rows"
          :key="row.kind"
          class="
            relative flex flex-col gap-2 rounded-lg border border-default
            bg-default p-3
            lg:flex-row lg:items-start lg:gap-3.5 lg:rounded-none lg:border-0
            lg:bg-transparent lg:p-4
          "
        >
          <span
            class="
              grid size-9 shrink-0 place-items-center rounded-lg
              bg-(--ui-secondary-soft) text-accent
              lg:size-11
            "
          >
            <UIcon
              :name="row.icon"
              class="
                size-5
                lg:size-5.5
              "
            />
          </span>
          <div
            class="
              flex flex-col gap-2
              lg:gap-0.75
            "
          >
            <p
              class="
                text-sm/[1.3] font-bold text-highlighted
                lg:text-[0.9375rem]/[1.35]
              "
            >
              <NuxtLink
                v-if="row.to"
                :to="row.to"
                class="
                  after:absolute after:inset-0
                  hover:text-accent
                  focus-visible:outline-2 focus-visible:outline-secondary
                "
              >
                {{ row.title }}
              </NuxtLink>
              <template v-else>
                {{ row.title }}
              </template>
            </p>
            <p
              v-if="row.note"
              class="
                text-xs/[1.4] text-muted
                lg:text-[0.8125rem]/[1.45]
              "
            >
              {{ row.note }}
            </p>
          </div>
        </li>
      </ul>
    </UContainer>
  </section>
  <PageSectionBand
    v-else-if="rows.length"
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
