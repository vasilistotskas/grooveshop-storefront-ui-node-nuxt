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
 *
 * Below `sm` the heading row stacks: the heading and its sub-line take the
 * whole width and the link goes under them, where beside them it squeezed a
 * heading into a word per line at 390px. The link's hit area is at least
 * 44px tall there (WCAG 2.5.8 target size, 2.5.5 on a phone); from `sm` up
 * the row and the link are as they were.
 */
const props = withDefaults(defineProps<{
  /** Which page surface this band paints. */
  surface?: 'default' | 'muted' | 'inverted'
  /**
   * The colour scheme the band is drawn in: `light` or `dark` in both of the
   * page's modes, every token inside with it (`colorSchemeClass`), or the
   * page's own.
   */
  colorScheme?: SectionColorScheme
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
  /**
   * Where the base design puts the link on a phone: beside the heading
   * (`inline`), as a full-width button under the band's content
   * (`below`), or nowhere (`none`). Groove Volt stacks it under the heading.
   */
  phoneCta?: 'inline' | 'below' | 'none'
  /** A shorter link text for that phone row ("All"). */
  phoneCtaText?: string
}>(), {
  phoneCta: 'inline',
  phoneCtaText: undefined,
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

/**
 * The base design (a store with its own templates, webside) draws its board's
 * heading row: the eyebrow in the accent, capitals; a heavier heading; the
 * "see all" as a plain accent link with an arrow; on a phone no sub-line, and
 * the link where the section asks for it (`phoneCta`). Laid out `open`
 * (`useBandFlow`), its bands share the page's ground without rules, each
 * spaced from the one above by its top padding. Groove Volt keeps its own.
 */
const design = useStorefrontDesign()
const own = computed(() => design.value !== 'volt')
const open = useBandFlow() === 'open'

const hasLink = computed(() => !!(props.ctaText && props.ctaLink))
</script>

<template>
  <section
    :class="[
      'w-full',
      colorSchemeClass(colorScheme),
      own && open ? [
        surface === 'muted' && 'border-y border-default bg-muted',
        surface === 'inverted' && 'bg-inverted text-inverted',
        padding !== 'none' && `
          pt-11
          lg:pt-22
        `,
      ] : [
        surface === 'muted' && 'bg-muted',
        surface === 'default' && 'border-y border-default bg-default',
        surface === 'inverted' && 'bg-inverted text-inverted',
        padding === 'md' && `
          py-12
          lg:py-22
        `,
        padding === 'sm' && `
          py-8
          lg:py-14
        `,
      ],
    ]"
  >
    <component
      :is="container"
      class="flex flex-col"
      :class="own ? `
        gap-4
        lg:gap-7
      ` : `
        gap-5
        lg:gap-7
      `"
    >
      <slot name="header">
        <div
          v-if="own && (heading || subheading || eyebrow || hasLink)"
          class="
            flex items-center justify-between gap-4
            sm:items-end sm:gap-5
          "
        >
          <div class="flex min-w-0 flex-col">
            <p
              v-if="eyebrow"
              class="
                mb-1 text-xs font-bold tracking-[0.06em] uppercase
                lg:mb-1.5 lg:text-[0.8125rem]
              "
              :class="surface === 'inverted' ? 'text-(--ui-volt-on-inverted)' : `
                text-accent
              `"
            >
              {{ eyebrow }}
            </p>
            <h2
              v-if="heading"
              class="
                font-display text-[1.625rem]/[1.2] font-extrabold text-balance
                wrap-break-word
                lg:text-[2.125rem]/[1.15]
              "
              :class="surface === 'inverted' ? 'text-inverted' : `
                text-highlighted
              `"
            >
              {{ heading }}
            </h2>
            <p
              v-if="subheading"
              class="
                mt-2 max-w-2xl text-base
                max-sm:hidden
              "
              :class="surface === 'inverted' ? 'text-inverted/75' : `text-muted`"
            >
              {{ subheading }}
            </p>
          </div>

          <!-- A 44px target (WCAG 2.5.5), text alone with its arrow. -->
          <NuxtLink
            v-if="hasLink"
            :to="ctaLink"
            class="
              inline-flex min-h-11 shrink-0 items-center gap-1.5 px-1 text-sm
              font-semibold text-accent
              hover:underline
              focus-visible:outline-2 focus-visible:outline-secondary
              sm:text-[0.9375rem]
            "
            :class="phoneCta !== 'inline' && 'max-sm:hidden'"
          >
            <template v-if="phoneCtaText">
              <span class="sm:hidden">{{ phoneCtaText }}</span>
              <span class="max-sm:hidden">{{ ctaText }}</span>
            </template>
            <template v-else>{{ ctaText }}</template>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 shrink-0"
            />
          </NuxtLink>
        </div>
        <div
          v-else-if="heading || subheading || eyebrow || hasLink"
          class="flex justify-between gap-4"
          :class="headingSize === 'lg'
            ? `
              flex-col items-start gap-3.5
              lg:flex-row lg:items-end lg:gap-4
            `
            : `
              flex-col items-start
              sm:flex-row sm:items-end
            `"
        >
          <div
            class="flex min-w-0 flex-col"
            :class="headingSize === 'lg' ? 'gap-2' : 'gap-1.5'"
          >
            <p
              v-if="eyebrow"
              class="text-xs font-bold tracking-[0.08em] uppercase"
              :class="surface === 'inverted' ? 'text-(--ui-volt-on-inverted)' : `
                text-muted
              `"
            >
              {{ eyebrow }}
            </p>
            <h2
              v-if="heading"
              class="
                font-display font-bold tracking-[-0.02em] text-balance
                wrap-break-word
              "
              :class="[
                surface === 'inverted' ? 'text-inverted' : 'text-highlighted',
                headingSize === 'lg'
                  ? `
                    text-[1.875rem]/[1.05]
                    lg:text-[2.75rem]/[1.05]
                  `
                  : `
                    text-[1.625rem]/[1.1]
                    lg:text-4xl/[1.1]
                  `,
              ]"
            >
              {{ heading }}
            </h2>
            <p
              v-if="subheading"
              class="
                max-w-2xl text-sm
                lg:text-base
              "
              :class="surface === 'inverted' ? 'text-inverted/75' : 'text-muted'"
            >
              {{ subheading }}
            </p>
          </div>

          <UButton
            v-if="hasLink"
            :to="ctaLink"
            :label="ctaText"
            size="sm"
            trailing-icon="i-heroicons-arrow-right"
            color="neutral"
            :variant="surface === 'inverted' ? 'solid' : 'outline'"
            :class="surface === 'inverted' && `
              bg-volt text-on-volt
              hover:bg-volt/90
            `"
            class="
              min-h-11 shrink-0
              sm:min-h-0
            "
          />
        </div>
      </slot>

      <slot />

      <!-- The base design's phone: the link as a full-width button under
           what the band lists, where a thumb finishes reading it. -->
      <UButton
        v-if="own && phoneCta === 'below' && hasLink"
        :to="ctaLink"
        :label="ctaText"
        color="neutral"
        variant="outline"
        size="xl"
        trailing-icon="i-lucide-arrow-right"
        class="
          min-h-12 w-full justify-center text-[0.9375rem] font-semibold
          text-highlighted
          sm:hidden
        "
      />
    </component>
  </section>
</template>
