<script lang="ts" setup>
/**
 * The frame every page-builder section renders inside.
 *
 * A page built from sections is a stack of full-width BANDS: each owns
 * the viewport's width, its own ground, and a rule against its
 * neighbour. The container lives INSIDE the band rather than around the
 * stack, which is what lets one section paint edge to edge (a hero, a
 * photo strip) while the next keeps the store's measure.
 *
 * `surface` alternates the warm ground (`muted`) and the white raised
 * band (`default`), which carries a hairline above and below as the
 * design draws it; `inverted` is the ink band (the offers). The ground
 * and the white are one step apart in both colour modes on purpose
 * (`app/assets/css/main.css`).
 *
 * The heading block is here rather than in each section because it is
 * the same three lines everywhere — eyebrow, heading, standfirst — and
 * because a section that writes its own drifts: the previous sections
 * each carried their own `<h2 class="mb-4 text-2xl font-bold">`, with
 * the operator's `title` as the only input and no way to add a line
 * under it or a link beside it.
 */
const props = withDefaults(defineProps<{
  /** Which page surface this band paints. */
  surface?: 'default' | 'muted' | 'inverted'
  /** Small line above the heading. */
  eyebrow?: string
  heading?: string
  /** One line under the heading. */
  subheading?: string
  /** Optional link at the end of the heading row ("See all"). */
  ctaText?: string
  ctaLink?: string
  /** Vertical rhythm. `none` is for a band that paints its own. */
  padding?: 'none' | 'sm' | 'md'
  /**
   * `lg` is the heading of a band that leads with it (the offers): set
   * larger, and on a phone its link goes under it rather than beside.
   */
  headingSize?: 'md' | 'lg'
  /** Drop the container for a band that runs edge to edge. */
  bleed?: boolean
}>(), {
  surface: 'default',
  padding: 'md',
  headingSize: 'md',
})

defineSlots<{
  default(props: object): unknown
  /** Replaces the whole heading row. */
  header(props: object): unknown
}>()

/**
 * Resolved here rather than named as a string in `:is`. A string that
 * is not a native tag renders as an unknown ELEMENT — `<UContainer>`
 * reached the document verbatim, carrying none of the container's
 * measure or gutters, and every band on the page lost its frame.
 */
const container = computed(() =>
  props.bleed ? 'div' : resolveComponent('UContainer'),
)
</script>

<template>
  <section
    :class="[
      'w-full',
      surface === 'muted' && 'bg-muted',
      surface === 'default' && 'border-y border-default bg-default',
      surface === 'inverted' && 'bg-inverted text-inverted',
      padding === 'md' && 'py-12 lg:py-22',
      padding === 'sm' && 'py-8 lg:py-14',
    ]"
  >
    <component
      :is="container"
      class="flex flex-col gap-5 lg:gap-7"
    >
      <slot name="header">
        <div
          v-if="heading || subheading || eyebrow || (ctaText && ctaLink)"
          class="flex justify-between gap-4"
          :class="headingSize === 'lg'
            ? 'flex-col items-start gap-3.5 lg:flex-row lg:items-end lg:gap-4'
            : 'items-end'"
        >
          <div
            class="flex min-w-0 flex-col"
            :class="headingSize === 'lg' ? 'gap-2' : 'gap-1.5'"
          >
            <p
              v-if="eyebrow"
              class="text-xs font-bold tracking-[0.08em] uppercase"
              :class="surface === 'inverted' ? 'text-(--ui-volt-on-inverted)' : 'text-muted'"
            >
              {{ eyebrow }}
            </p>
            <h2
              v-if="heading"
              class="font-display font-bold tracking-[-0.02em] text-balance"
              :class="[
                surface === 'inverted' ? 'text-inverted' : 'text-highlighted',
                headingSize === 'lg'
                  ? 'text-[1.875rem]/[1.05] lg:text-[2.75rem]/[1.05]'
                  : 'text-[1.625rem]/[1.1] lg:text-4xl/[1.1]',
              ]"
            >
              {{ heading }}
            </h2>
            <p
              v-if="subheading"
              class="max-w-2xl text-sm lg:text-base"
              :class="surface === 'inverted' ? 'text-inverted/75' : 'text-muted'"
            >
              {{ subheading }}
            </p>
          </div>

          <UButton
            v-if="ctaText && ctaLink"
            :to="ctaLink"
            :label="ctaText"
            size="sm"
            trailing-icon="i-heroicons-arrow-right"
            color="neutral"
            :variant="surface === 'inverted' ? 'solid' : 'outline'"
            :class="surface === 'inverted' && 'bg-volt text-on-volt hover:bg-volt/90'"
            class="shrink-0"
          />
        </div>
      </slot>

      <slot />
    </component>
  </section>
</template>
