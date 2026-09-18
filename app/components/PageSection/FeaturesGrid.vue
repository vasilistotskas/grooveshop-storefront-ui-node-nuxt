<script lang="ts" setup>
/**
 * What the store promises, in cells.
 *
 * `decor` decides how the cells are drawn:
 * - `framed` — one bordered box divided by rules, for parts of a single
 *   promise rather than a list of separate ones;
 * - `gradient_tiles` — the icon sits on a gradient tile;
 * - `none` — the plain cell.
 *
 * `prompt` is the cell at the end that answers "what if mine is not one
 * of these?", which is a link rather than a feature.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  /** A standfirst under the heading. */
  body?: string
  items?: Array<{ title: string, text?: string, icon?: string }>
  columns?: number
  decor?: 'none' | 'gradient_tiles' | 'framed'
  ctaText?: string
  ctaLink?: string
  prompt?: { title: string, text?: string, ctaText?: string, ctaLink?: string }
  surface?: 'default' | 'muted'
}>(), {
  columns: 3,
  decor: 'none',
})

const localePath = useLocalePath()

// Static class map so Tailwind sees every variant at build time.
const COLUMN_CLASSES: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
}

const columnsClass = computed(
  () => COLUMN_CLASSES[props.columns] ?? COLUMN_CLASSES[3],
)

const framed = computed(() => props.decor === 'framed')
</script>

<template>
  <PageSectionBand
    v-if="items?.length"
    :heading="heading || title"
    :subheading="body"
    :cta-text="ctaText"
    :cta-link="ctaLink ? localePath(ctaLink) : undefined"
    :surface="surface"
  >
    <div
      :class="[
        'grid grid-cols-1 gap-px sm:grid-cols-2',
        columnsClass,
        framed
          ? 'overflow-hidden rounded-xl bg-accented ring ring-default'
          : 'gap-5 bg-transparent',
      ]"
    >
      <UPageFeature
        v-for="(item, idx) in items"
        :key="idx"
        orientation="vertical"
        :icon="item.icon"
        :title="item.title"
        :description="item.text"
        :ui="{
          root: framed
            ? 'bg-default p-6'
            : 'rounded-xl bg-default p-6 ring ring-default',
          title: 'font-display text-base font-semibold text-highlighted',
          description: 'text-sm text-muted',
          leadingIcon: decor === 'gradient_tiles'
            ? 'text-inverted'
            : 'text-secondary',
          leading: decor === 'gradient_tiles'
            ? `
              mb-4 flex size-11 items-center justify-center rounded-lg
              bg-secondary
            `
            : 'mb-4',
        }"
      />

      <UPageCard
        v-if="prompt"
        :title="prompt.title"
        :description="prompt.text"
        :to="prompt.ctaLink ? localePath(prompt.ctaLink) : undefined"
        variant="soft"
        :ui="{
          root: framed ? 'rounded-none' : undefined,
          title: 'font-display text-base font-semibold',
          description: 'text-sm',
        }"
      >
        <template
          v-if="prompt.ctaText && prompt.ctaLink"
          #footer
        >
          <UButton
            :label="prompt.ctaText"
            :to="localePath(prompt.ctaLink)"
            color="neutral"
            variant="link"
            trailing-icon="i-heroicons-arrow-right"
            class="p-0"
          />
        </template>
      </UPageCard>
    </div>
  </PageSectionBand>
</template>
