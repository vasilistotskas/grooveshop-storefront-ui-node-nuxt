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

const { logoLightUrl, logoDarkUrl } = useTenantBranding()
const hasDistinctDark = computed(
  () => logoDarkUrl.value !== logoLightUrl.value,
)
const priorityAttrs = computed(() =>
  props.priority ? { 'fetch-priority': 'high' as const, 'preload': true } : {},
)
</script>

<template>
  <NuxtImg
    :style="{ objectFit: 'contain' }"
    :src="logoLightUrl"
    :width="width"
    :height="height"
    :class="hasDistinctDark ? 'dark:hidden' : undefined"
    alt=""
    quality="90"
    v-bind="priorityAttrs"
  />
  <NuxtImg
    v-if="hasDistinctDark"
    :style="{ objectFit: 'contain' }"
    :src="logoDarkUrl"
    :width="width"
    :height="height"
    class="hidden dark:block"
    alt=""
    quality="90"
    v-bind="priorityAttrs"
  />
</template>
