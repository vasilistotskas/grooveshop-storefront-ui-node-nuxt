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
 * it, the copy takes whichever colour clears AA on it, in both colour
 * modes. A dark navy with the page's ordinary heading colour on it is
 * unreadable, and so is white on a mid-tone terracotta.
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
 * The copy's colour on the operator's `#RRGGBB` (the only shape the
 * props schema admits), set on the band so the heading and its line
 * inherit it. The page's own text colours flip with the colour mode;
 * the operator's hex does not, so neither may the copy on it.
 */
const copyColor = computed(() =>
  props.backgroundColor ? readableTextOn(props.backgroundColor) : undefined,
)

/** Copy lighter than the band means a dark band, which takes a white button. */
const isDarkBackground = computed(() =>
  !!props.backgroundColor
  && !!copyColor.value
  && relativeLuminance(copyColor.value) > relativeLuminance(props.backgroundColor),
)

const hasLink = computed(() => !!(props.buttonText && props.buttonLink))
</script>

<template>
  <PageSectionBand
    v-if="label || description || hasLink"
    :surface="surface"
    :style="backgroundColor ? { backgroundColor, color: copyColor } : undefined"
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
              !backgroundColor && 'text-highlighted',
            ]"
          >
            {{ label }}
          </h2>
          <p
            v-if="description"
            :class="[
              'text-base text-pretty md:text-lg',
              !backgroundColor && 'text-muted',
            ]"
          >
            {{ description }}
          </p>
        </div>

        <UButton
          v-if="hasLink"
          :to="localePath(pathLocation(buttonLink!))"
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
