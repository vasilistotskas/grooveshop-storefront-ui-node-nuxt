<script lang="ts" setup>
/**
 * One ask, alone on a band.
 *
 * A STATEMENT: the heading and its one line on the left, the action
 * on the right, the way a band's own heading row is laid out — not a
 * centred stack. The previous rendering stacked `UPageCTA`'s own
 * vertical padding (its `sm:py-24` survives a `p-0` override, because
 * an unprefixed class does not replace a breakpointed one) inside the
 * band's, and drew 480px for a heading, a line and a button.
 *
 * `surface` is how a page separates this band from the one above it.
 * `backgroundColor` is the operator's own hex and overrides the
 * surface — and, because a hex says nothing about the text on top of
 * it, the copy switches to light or dark by the colour's luminance. A
 * dark navy with the page's ordinary heading colour on it is
 * unreadable.
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

const hasLink = computed(() => !!(props.buttonText && props.buttonLink))
</script>

<template>
  <PageSectionBand
    v-if="label || description || hasLink"
    :surface="surface"
    :style="backgroundColor ? { backgroundColor } : undefined"
  >
    <template #header>
      <div
        class="
          flex flex-col gap-5
          md:flex-row md:items-center md:justify-between md:gap-10
        "
      >
        <div class="flex max-w-2xl flex-col gap-2">
          <h2
            v-if="label"
            :class="[
              'font-display text-2xl font-semibold tracking-tight text-balance md:text-3xl',
              isDarkBackground ? 'text-white' : 'text-highlighted',
            ]"
          >
            {{ label }}
          </h2>
          <p
            v-if="description"
            :class="[
              'text-base text-pretty md:text-lg',
              isDarkBackground ? 'text-white/85' : 'text-muted',
            ]"
          >
            {{ description }}
          </p>
        </div>

        <UButton
          v-if="hasLink"
          :to="localePath(buttonLink!)"
          :label="buttonText"
          :color="isDarkBackground ? 'neutral' : 'secondary'"
          size="xl"
          class="shrink-0 self-start md:self-auto"
          :class="isDarkBackground && 'bg-white text-neutral-950 hover:bg-white/90'"
        />
      </div>
    </template>
  </PageSectionBand>
</template>
