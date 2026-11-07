<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The tenant's one link: an ink pill, an outlined pill, an apricot
 * pill, the bold underlined text link with an arrow, or a plain link
 * that takes the colour of the text around it (the ribbon's names, on
 * ink).
 *
 * Shared by the section bands rather than written ten times, so the
 * touch target, the focus ring and the destination handling (a path
 * gets the locale prefix, an `https:` URL is left alone) are decided
 * once. The ink pill is `--fy-text` on `--fy-ground`, which is ink on
 * paper in light mode and paper on ink in dark.
 *
 * With no `to` it is a button in the same look, for a section's action
 * that does something other than go somewhere (`useSectionAction`).
 */
const props = withDefaults(defineProps<{
  to?: string
  look?: 'ink' | 'outline' | 'apricot' | 'text' | 'plain'
  arrow?: boolean
  loading?: boolean
}>(), {
  look: 'text',
  arrow: false,
})

const localePath = useLocalePath()

const target = computed(() => {
  if (props.to === undefined) return undefined
  return /^https:\/\//.test(props.to) ? props.to : localePath(pathLocation(props.to))
})

const LOOKS = {
  ink: `
    min-h-[54px] rounded-full bg-(--fy-text) px-[26px] text-[16.5px]
    font-semibold text-(--fy-ground)
    focus-visible:outline-(--fy-focus)
  `,
  outline: `
    min-h-[54px] rounded-full border-2 border-(--fy-text) px-[26px]
    text-[16.5px] font-semibold text-(--fy-text)
    focus-visible:outline-(--fy-focus)
  `,
  apricot: `
    min-h-[54px] rounded-full bg-(--fy-accent) px-[26px] text-[16.5px]
    font-bold text-(--fy-on-accent)
    focus-visible:outline-(--fy-focus)
  `,
  text: `
    min-h-11 text-base font-bold text-(--fy-text) underline
    underline-offset-4
    hover:text-(--fy-eyebrow)
    focus-visible:outline-(--fy-focus)
  `,
  plain: `
    min-h-11 underline-offset-4
    hover:underline
    focus-visible:outline-(--fy-accent)
  `,
} as const
</script>

<template>
  <NuxtLink
    v-if="target"
    :to="target"
    class="
      inline-flex items-center gap-2.5
      focus-visible:outline-3 focus-visible:outline-offset-3
    "
    :class="LOOKS[look]"
  >
    <slot />
    <UIcon
      v-if="arrow"
      name="i-lucide:arrow-right"
      class="size-[18px] shrink-0"
      aria-hidden="true"
    />
  </NuxtLink>
  <button
    v-else
    type="button"
    class="
      inline-flex cursor-pointer items-center gap-2.5
      focus-visible:outline-3 focus-visible:outline-offset-3
      disabled:cursor-not-allowed disabled:opacity-60
    "
    :class="LOOKS[look]"
    :aria-busy="loading || undefined"
  >
    <slot />
    <UIcon
      v-if="arrow"
      name="i-lucide:arrow-right"
      class="size-[18px] shrink-0"
      aria-hidden="true"
    />
  </button>
</template>
