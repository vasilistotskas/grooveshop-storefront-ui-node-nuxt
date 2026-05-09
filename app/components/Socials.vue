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

const { t } = useI18n()
const config = useRuntimeConfig()
const tenantStore = useTenantStore()

interface SocialItem {
  key: string
  to?: string
  icon: string
  label: string
  /** Tailwind arbitrary-value hex — hover/focus color only. */
  colorClass: string
}

// Prefer per-tenant social URL; fall back to platform-wide env var.
const platformSocials = config.public.socials as Record<string, string | undefined>
function socialUrl(key: string): string | undefined {
  return (tenantStore.socials as Record<string, string>)[key] || platformSocials[key] || undefined
}

const socials = computed<SocialItem[]>(() => [
  {
    key: 'instagram',
    to: socialUrl('instagram'),
    icon: 'i-mdi-instagram',
    label: t('instagram'),
    colorClass: 'hover:text-[#E4405F] focus-visible:text-[#E4405F]',
  },
  {
    key: 'tiktok',
    to: socialUrl('tiktok'),
    icon: 'i-ant-design-tik-tok-filled',
    label: t('tiktok'),
    colorClass: 'hover:text-[#010101] focus-visible:text-[#010101] dark:hover:text-white dark:focus-visible:text-white',
  },
  {
    key: 'reddit',
    to: socialUrl('reddit'),
    icon: 'i-mdi-reddit',
    label: t('reddit'),
    colorClass: 'hover:text-[#FF4500] focus-visible:text-[#FF4500]',
  },
  {
    key: 'youtube',
    to: socialUrl('youtube'),
    icon: 'i-mdi-youtube',
    label: t('youtube'),
    colorClass: 'hover:text-[#FF0000] focus-visible:text-[#FF0000]',
  },
  {
    key: 'pinterest',
    to: socialUrl('pinterest'),
    icon: 'i-mdi-pinterest',
    label: t('pinterest'),
    colorClass: 'hover:text-[#E60023] focus-visible:text-[#E60023]',
  },
  {
    key: 'facebook',
    to: socialUrl('facebook'),
    icon: 'i-mdi-facebook',
    label: t('facebook'),
    colorClass: 'hover:text-[#1877F2] focus-visible:text-[#1877F2]',
  },
  {
    key: 'discord',
    to: socialUrl('discord'),
    icon: 'i-mdi-discord',
    label: t('discord'),
    colorClass: 'hover:text-[#5865F2] focus-visible:text-[#5865F2]',
  },
])

const visible = computed(() => socials.value.filter(s => !!s.to))
</script>

<template>
  <UButton
    v-for="s in visible"
    :key="s.key"
    :external="true"
    :size="buttonSize"
    :to="s.to"
    color="neutral"
    target="_blank"
    rel="noopener noreferrer"
    variant="link"
    :aria-label="s.label"
    :title="s.label"
    :class="[
      'transition-colors motion-reduce:transition-none',
      s.colorClass,
    ]"
  >
    <UIcon :name="s.icon" :class="iconClass" />
    <span class="sr-only">{{ s.label }}</span>
  </UButton>
</template>

<i18n lang="yaml">
el:
  instagram: Instagram
  tiktok: TikTok
  reddit: Reddit
  youtube: YouTube
  pinterest: Pinterest
  facebook: Facebook
  discord: Discord
</i18n>
