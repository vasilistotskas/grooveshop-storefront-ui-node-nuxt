<script lang="ts" setup>
/**
 * The column every sign-in page is: an optional icon tile, the page's
 * one heading in the display face, a line under it, then the page's own
 * content stacked at the board's 24px rhythm — 440px wide at most.
 *
 * The page heading is the page's `<h1>`; there is no breadcrumb on these
 * pages (the layout's logo and back button are the way out).
 */
defineProps<{
  title: string
  lead?: string
  /** An icon tile above the heading, for the pages that confirm something. */
  icon?: string
}>()
</script>

<template>
  <div class="flex w-full max-w-110 flex-col gap-6">
    <span
      v-if="icon"
      class="flex size-12 items-center justify-center rounded-[0.875rem] bg-elevated text-highlighted"
    >
      <UIcon
        :name="icon"
        class="size-6"
      />
    </span>
    <div class="flex flex-col gap-2">
      <h1
        class="
          font-display text-[2rem]/[1.05] font-bold tracking-[-0.02em]
          text-highlighted text-balance
          lg:text-[2.5rem]/[1.05]
        "
      >
        {{ title }}
      </h1>
      <p
        v-if="lead"
        class="text-base text-muted"
      >
        {{ lead }}
      </p>
    </div>
    <slot />
  </div>
</template>
