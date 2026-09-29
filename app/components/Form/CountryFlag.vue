<script lang="ts" setup>
const props = defineProps<{
  /** ISO 3166-1 alpha-2 code, either case. */
  alpha2: string
}>()

// `i-circle-flags:xx` is built from data, so no source scan can see it:
// `nuxt.config.ts` (`icon`) says how each flag reaches SSR and the browser.
const icon = computed(() => `i-circle-flags:${props.alpha2.toLowerCase()}`)
</script>

<template>
  <!--
    The ISO code sits UNDER the flag: a code with no flag (or one still
    being fetched) reads as a labelled disc instead of an empty one, and
    a resolved flag covers it. Decorative — the picker's own label and
    the country name carry the meaning.
  -->
  <span
    class="relative inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-[0.5rem] font-semibold leading-none text-muted"
    aria-hidden="true"
  >
    {{ alpha2.toUpperCase() }}
    <UIcon :name="icon" class="absolute inset-0 size-full" />
  </span>
</template>
