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
    /** Tailwind object-position classes: where the logo sits inside
     *  the fixed fit box. Parent-centered boxes need `object-center`,
     *  header rows `object-left`; responsive contexts combine them
     *  (e.g. `object-center lg:object-left`). */
    imgClass?: string
  }>(),
  {
    width: 145,
    height: 30,
    priority: false,
    imgClass: 'object-left',
  },
)

// ``width``/``height`` are a FIT BOX the img occupies at FIXED size.
// Tailwind's preflight sets ``img { height: auto }``, which discards
// the height ATTRIBUTE — a square logo (tenant #2's round seal)
// rendered at its natural aspect ratio, 145px wide and 144px TALL,
// quadrupling the header. An earlier auto-sized variant
// (max-width/max-height + width/height auto) contained the aspect
// ratio but reserved NO space before the image decoded — the img was
// 0×0 until then, so the header collapsed and popped on every
// uncached load. Fixed box + object-fit keeps layout stable at all
// times for any logo shape.
const fitBox = computed(() => ({
  objectFit: 'contain' as const,
  width: `${props.width}px`,
  height: `${props.height}px`,
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
       store's logo asset (useTenantBranding returns '' in that case).

       `width` is the IMG's fit box and is NOT a cap on the wordmark:
       capping it there cut the demo store's own name down to
       "GrooveSho…" in its own header, because 132px of box cannot hold
       178px of "GrooveShop Demo" — and most store names are longer
       than a logo is wide. The HEIGHT is still reserved, so the header
       does not jump. `min-w-0` keeps `truncate` available for a flex
       parent that really is out of room; measured at 1440/768/390 the
       full name fits with the document no wider than the viewport. -->
  <span
    v-if="!logoLightUrl"
    class="
      min-w-0 truncate text-xl font-bold text-primary-950
      dark:text-primary-50
    "
    :style="{ lineHeight: `${height}px` }"
  >{{ tenantStore.storeName }}</span>
  <NuxtImg
    v-else
    :style="fitBox"
    :src="lightSrc"
    :width="width"
    :height="height"
    fit="inside"
    :class="[imgClass, hasDistinctDark ? 'dark:hidden' : '']"
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
    fit="inside"
    :class="[imgClass, 'hidden dark:block']"
    alt=""
    quality="90"
    v-bind="priorityAttrs"
  />
</template>
