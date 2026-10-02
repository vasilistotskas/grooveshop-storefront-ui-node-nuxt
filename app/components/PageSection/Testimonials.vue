<script lang="ts" setup>
/**
 * What customers said, as quotation cards.
 *
 * Each is a `<figure>` — the stars, the words in a `<blockquote>`, the
 * person in its `<figcaption>` — which is the structure HTML gives a
 * quotation and its attribution, so a screen reader hears who said what
 * without extra labelling. The person sits at the foot of the card
 * whatever the quote's length, so a row of cards ends on one line.
 *
 * `rating` is the five-point scale a reader expects, not
 * `ProductReview`'s internal 1..10 — the merchant types what the stars
 * should show. `role` is who the quote is from ("Verified buyer",
 * "Χονδρική"), which is what gives it weight.
 */
defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  items?: Array<{
    name: string
    text: string
    avatar?: string
    role?: string
    rating?: number
  }>
  surface?: 'default' | 'muted'
}>()

const { t } = useI18n()
</script>

<template>
  <PageSectionBand
    v-if="items?.length"
    :heading="heading || title"
    :surface="surface"
  >
    <div
      class="
        grid gap-3
        md:grid-cols-2
        lg:grid-cols-3 lg:gap-5
      "
    >
      <figure
        v-for="(item, idx) in items"
        :key="idx"
        class="flex flex-col gap-4.5 rounded-md border border-default bg-default p-6"
      >
        <UInputRating
          v-if="item.rating"
          :model-value="item.rating"
          :length="5"
          size="xs"
          color="primary"
          icon="i-heroicons-star-solid"
          :ui="{ item: 'size-3.5', icon: 'size-3.5', emptyIcon: `
            text-(--ui-border-accented)
          ` }"
          readonly
          :aria-label="t('rated', { n: item.rating })"
        />
        <!-- The quotation marks come from the page language
             (`quotes: auto`): «» in Greek, “” in English — typed into
             the markup they would be English on both. -->
        <blockquote
          class="
            text-base/[1.55] text-pretty text-highlighted
            [quotes:auto]
          "
        >
          <p
            class="
              before:content-[open-quote]
              after:content-[close-quote]
            "
          >
            {{ item.text }}
          </p>
        </blockquote>
        <figcaption class="mt-auto">
          <UUser
            :name="item.name"
            :description="item.role"
            :avatar="item.avatar
              ? { src: item.avatar, alt: item.name }
              : { text: item.name.slice(0, 1), ui: { root: 'bg-elevated', fallback: 'text-sm font-extrabold text-highlighted' } }"
            size="xl"
            :ui="{ root: 'gap-3', name: 'text-sm font-bold', description: `
              text-[0.8125rem]
            ` }"
          />
        </figcaption>
      </figure>
    </div>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  rated: 'Βαθμολογία {n} στα 5'
en:
  rated: 'Rated {n} out of 5'
</i18n>
