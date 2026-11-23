<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

/**
 * Social-platform icon row. Each platform has its own brand-colour
 * class applied as a hover tint so the icons read as the real
 * network on hover/focus, rather than all sharing --ui-secondary.
 *
 * Resting state stays theme-neutral (primary-700 / primary-200) so
 * the row integrates with both the navbar and the footer without
 * a rainbow of competing colours at rest. Colour shows up on
 * interaction and active focus, carrying through reduce-motion.
 */

defineProps({
  buttonSize: {
    type: String as PropType<ButtonProps['size']>,
    default: 'md',
  },
  iconClass: {
    type: String,
    default: 'text-3xl',
  },
})

/**
 * The store's networks in webside's order: LinkedIn last, as the store
 * asked (2026-11-21).
 */
const ORDER = [
  'instagram',
  'tiktok',
  'reddit',
  'youtube',
  'pinterest',
  'facebook',
  'twitter',
  'discord',
  'linkedin',
] as const satisfies readonly SocialNetwork[]

/** Tailwind arbitrary-value hex — hover/focus color only. */
const BRAND_COLOR_CLASS: Record<SocialNetwork, string> = {
  instagram: 'hover:text-[#E4405F] focus-visible:text-[#E4405F]',
  tiktok: 'hover:text-[#010101] focus-visible:text-[#010101] dark:hover:text-white dark:focus-visible:text-white',
  reddit: 'hover:text-[#FF4500] focus-visible:text-[#FF4500]',
  youtube: 'hover:text-[#FF0000] focus-visible:text-[#FF0000]',
  pinterest: 'hover:text-[#E60023] focus-visible:text-[#E60023]',
  facebook: 'hover:text-[#1877F2] focus-visible:text-[#1877F2]',
  twitter: 'hover:text-[#010101] focus-visible:text-[#010101] dark:hover:text-white dark:focus-visible:text-white',
  discord: 'hover:text-[#5865F2] focus-visible:text-[#5865F2]',
  linkedin: 'hover:text-[#0A66C2] focus-visible:text-[#0A66C2]',
}

const { socials } = useStoreSocials(ORDER)
</script>

<template>
  <UButton
    v-for="s in socials"
    :key="s.key"
    :external="true"
    :size="buttonSize"
    :to="s.url"
    color="neutral"
    target="_blank"
    rel="noopener noreferrer"
    variant="link"
    :aria-label="s.label"
    :title="s.label"
    :class="[
      `
        transition-colors
        motion-reduce:transition-none
      `,
      BRAND_COLOR_CLASS[s.key],
    ]"
  >
    <UIcon :name="s.icon" :class="iconClass" />
    <span class="sr-only">{{ s.label }}</span>
  </UButton>
</template>
