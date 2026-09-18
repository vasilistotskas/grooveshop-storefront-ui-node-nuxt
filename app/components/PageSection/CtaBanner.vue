<script lang="ts" setup>
/**
 * One ask, alone on a band.
 *
 * `surface` is how a page separates this band from the one above it.
 * `backgroundColor` is the operator's own hex and overrides the
 * surface — and, because a hex says nothing about the text on top of
 * it, the copy switches to light or dark by the colour's luminance. A
 * dark navy with the page's ordinary heading colour on it is
 * unreadable, which is exactly what the previous banner rendered.
 */
const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  description?: string
  buttonText?: string
  buttonLink?: string
  backgroundColor?: string
  surface?: 'default' | 'muted'
}>()

const localePath = useLocalePath()

const label = computed(() => props.heading || props.title)

/**
 * WCAG relative luminance of a `#RRGGBB` (the only shape the props
 * schema admits). Above the 0.5 midpoint the band is light and keeps
 * the page's own text colours.
 */
const isDarkBackground = computed(() => {
  const hex = props.backgroundColor
  if (!hex) return false

  const channel = (start: number) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  const luminance
    = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  return luminance < 0.5
})

const links = computed(() =>
  props.buttonText && props.buttonLink
    ? [{
        label: props.buttonText,
        to: localePath(props.buttonLink),
        color: 'secondary' as const,
        size: 'lg' as const,
      }]
    : undefined,
)
</script>

<template>
  <PageSectionBand
    v-if="label || description || links"
    :surface="surface"
    :style="backgroundColor ? { backgroundColor } : undefined"
  >
    <UPageCTA
      :title="label"
      :description="description"
      :links="links"
      variant="naked"
      :ui="{
        container: `
          p-0
          sm:px-0
          lg:px-0
        `,
        title: isDarkBackground
          ? 'font-display text-balance text-white'
          : 'font-display text-balance',
        description: isDarkBackground ? 'text-white/80' : undefined,
      }"
    />
  </PageSectionBand>
</template>
