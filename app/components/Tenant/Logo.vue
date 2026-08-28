<script lang="ts" setup>
/**
 * Color-mode-aware tenant logo.
 *
 * Renders TWO images — light with `dark:hidden`, dark with
 * `hidden dark:block` — so the switch is pure CSS: SSR-safe, no
 * `useColorMode()` read, no hydration mismatch, no flash. When a tenant
 * has no dark logo both images resolve to the same asset (see
 * `useTenantBranding`), which is exactly today's platform behavior.
 *
 * The dark image only exists in the DOM when it differs from the light
 * one, so un-themed tenants pay nothing.
 */
const props = withDefaults(
  defineProps<{
    width?: number
    height?: number
    /** Prioritize for LCP (navbar/checkout header): preload + high fetch priority. */
    priority?: boolean
  }>(),
  {
    width: 145,
    height: 30,
    priority: false,
  },
)

// ``width``/``height`` are a FIT BOX, not exact dimensions. Tailwind's
// preflight sets ``img { height: auto }``, which discards the height
// ATTRIBUTE — a square logo (tenant #2's round seal) rendered at its
// natural aspect ratio, 145px wide and 144px TALL, quadrupling the
// header. CSS max-dimensions contain any aspect ratio: wide wordmarks
// stay width-bound (unchanged), square seals become height-bound.
const fitBox = computed(() => ({
  objectFit: 'contain' as const,
  width: 'auto',
  height: 'auto',
  maxWidth: `${props.width}px`,
  maxHeight: `${props.height}px`,
}))

const { logoLightUrl, logoDarkUrl } = useTenantBranding()
const tenantStore = useTenantStore()
// Same-origin absolute URLs (Django URLField) bypass IPX; relativized
// they get WebP/AVIF + responsive variants (see useTenantAssetSrc).
const { relativize } = useTenantAssetSrc()
const lightSrc = computed(() => relativize(logoLightUrl.value))
const darkSrc = computed(() => relativize(logoDarkUrl.value))
const hasDistinctDark = computed(
  () => darkSrc.value !== lightSrc.value,
)
const priorityAttrs = computed(() =>
  props.priority ? { 'fetch-priority': 'high' as const, 'preload': true } : {},
)
</script>

<template>
  <!-- Unbranded non-platform tenant: text wordmark, never another
       store's logo asset (useTenantBranding returns '' in that case). -->
  <span
    v-if="!logoLightUrl"
    class="truncate text-xl font-bold text-primary-950 dark:text-primary-50"
    :style="{ maxWidth: `${width}px`, lineHeight: `${height}px` }"
  >{{ tenantStore.storeName }}</span>
  <NuxtImg
    v-else
    :style="fitBox"
    :src="lightSrc"
    :width="width"
    :height="height"
    :class="hasDistinctDark ? 'dark:hidden' : undefined"
    alt=""
    quality="90"
    v-bind="priorityAttrs"
  />
  <NuxtImg
    v-if="hasDistinctDark"
    :style="fitBox"
    :src="darkSrc"
    :width="width"
    :height="height"
    class="hidden dark:block"
    alt=""
    quality="90"
    v-bind="priorityAttrs"
  />
</template>
