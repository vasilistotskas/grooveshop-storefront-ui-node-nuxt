<script lang="ts" setup>
/**
 * The band a section draws in its bold look (`look: 'bold'`, every design):
 * `PageSection/Band`'s frame with a heavier heading row. The eyebrow in the
 * accent, in capitals; the heading at 26px on a phone and 34px on a desk, at
 * 800; the sub-line on a desk only; "see all" as an accent text link with its
 * arrow, and on a phone where the section asks for it (`phoneCta`): beside
 * the heading, as a full-width button under what the band lists, or nowhere.
 *
 * Laid out `open` by its shell (`useBandFlow`), bold bands share the page's
 * ground without rules, each spaced from the one above by its top padding;
 * otherwise each keeps `PageSection/Band`'s surface, rules and padding.
 */
const props = withDefaults(defineProps<{
  surface?: 'default' | 'muted' | 'inverted'
  colorScheme?: SectionColorScheme
  eyebrow?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  padding?: 'none' | 'sm' | 'md'
  bleed?: boolean
  /** Where the link goes on a phone: beside the heading, under the content as a button, or nowhere. */
  phoneCta?: 'inline' | 'below' | 'none'
  /** A shorter link text for the phone's row ("All"). */
  phoneCtaText?: string
}>(), {
  surface: 'default',
  padding: 'md',
  phoneCta: 'inline',
  phoneCtaText: undefined,
})

defineSlots<{
  default(props: object): unknown
  /** Replaces the whole heading row. */
  header(props: object): unknown
}>()

const open = useBandFlow() === 'open'

/** Resolved, not named as a string in `:is` (`PageSection/Band.vue`). */
const container = computed(() =>
  props.bleed ? 'div' : resolveComponent('UContainer'),
)

const hasLink = computed(() => !!(props.ctaText && props.ctaLink))
</script>

<template>
  <section
    :class="[
      'w-full',
      colorSchemeClass(colorScheme),
      surface === 'inverted' && 'bg-inverted text-inverted',
      open ? [
        surface === 'muted' && 'border-y border-default bg-muted',
        padding !== 'none' && `
          pt-11
          lg:pt-22
        `,
      ] : [
        surface === 'muted' && 'bg-muted',
        surface === 'default' && 'border-y border-default bg-default',
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
      class="
        flex flex-col gap-4
        lg:gap-7
      "
    >
      <slot name="header">
        <div
          v-if="heading || subheading || eyebrow || hasLink"
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
            <template v-else>
              {{ ctaText }}
            </template>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 shrink-0"
            />
          </NuxtLink>
        </div>
      </slot>

      <slot />

      <!-- The phone's link as a full-width button under what the band
           lists, where a thumb finishes reading it. -->
      <UButton
        v-if="phoneCta === 'below' && hasLink"
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
