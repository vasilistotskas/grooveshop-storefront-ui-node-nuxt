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
 * `surface` alternates ground and raised. The two tokens are one step
 * apart in both colour modes on purpose (`app/assets/css/main.css`), so
 * alternating them separates two bands without a rule and without a
 * third colour.
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
  surface?: 'default' | 'muted'
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
  /** Drop the container for a band that runs edge to edge. */
  bleed?: boolean
}>(), {
  surface: 'default',
  padding: 'md',
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
      surface === 'muted' ? 'bg-muted' : 'bg-default',
      padding === 'md' && 'py-12 md:py-16',
      padding === 'sm' && 'py-8 md:py-10',
    ]"
  >
    <component
      :is="container"
      class="flex flex-col gap-6 md:gap-8"
    >
      <slot name="header">
        <div
          v-if="heading || subheading || eyebrow || (ctaText && ctaLink)"
          class="
            flex flex-col gap-3
            sm:flex-row sm:items-end sm:justify-between
          "
        >
          <div class="flex flex-col gap-1.5">
            <p
              v-if="eyebrow"
              class="text-xs font-medium tracking-wide text-muted uppercase"
            >
              {{ eyebrow }}
            </p>
            <h2
              v-if="heading"
              class="
                font-display text-2xl font-semibold tracking-tight
                text-highlighted text-balance
                md:text-3xl
              "
            >
              {{ heading }}
            </h2>
            <p
              v-if="subheading"
              class="max-w-2xl text-sm text-muted md:text-base"
            >
              {{ subheading }}
            </p>
          </div>

          <UButton
            v-if="ctaText && ctaLink"
            :to="ctaLink"
            :label="ctaText"
            color="neutral"
            variant="link"
            trailing-icon="i-heroicons-arrow-right"
            class="shrink-0 self-start sm:self-auto"
          />
        </div>
      </slot>

      <slot />
    </component>
  </section>
</template>
