<script lang="ts" setup>
/**
 * What customers said, set as quotations.
 *
 * Not cards: a quote is somebody's words, and boxing each one in the
 * same ring as a product made the homepage one grid of identical tiles
 * from top to bottom. Each is a `<figure>` — the words in a
 * `<blockquote>`, the person in its `<figcaption>` — which is the
 * structure HTML gives a quotation and its attribution, so a screen
 * reader hears who said what without extra labelling.
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
        grid gap-x-10 gap-y-10
        md:grid-cols-2
        lg:grid-cols-3
      "
    >
      <figure
        v-for="(item, idx) in items"
        :key="idx"
        class="flex flex-col gap-4"
      >
        <UInputRating
          v-if="item.rating"
          :model-value="item.rating"
          :length="5"
          size="xs"
          color="warning"
          readonly
          :aria-label="t('rated', { n: item.rating })"
        />
        <!-- The quotation marks come from the page language
             (`quotes: auto`): «» in Greek, “” in English — typed into
             the markup they would be English on both. -->
        <blockquote
          class="
            font-display text-lg text-pretty text-highlighted
            [quotes:auto]
            md:text-xl
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
        <!-- `toned`, not the muted UUser paints a description in: muted
             is calibrated against `bg-default` and measured 3.06:1 on a
             raised surface in dark mode. -->
        <figcaption class="mt-auto">
          <UUser
            :name="item.name"
            :description="item.role"
            :avatar="item.avatar ? { src: item.avatar, alt: item.name } : { text: item.name.slice(0, 1) }"
            size="sm"
            :ui="{ description: 'text-toned' }"
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
