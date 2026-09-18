<script lang="ts" setup>
/**
 * The product card before its data arrives.
 *
 * Shaped like the card it stands in for — same frame, same 4:3 image,
 * same four rows — so the grid does not reflow when the products land.
 * A generic box would move every card down the page the moment it was
 * replaced.
 *
 * `USkeleton` brings its own pulse; the hand-rolled shimmer this
 * carried was built on `--color-neutral-*` variables that the Tailwind
 * v4 theme no longer defines, so it animated a transparent gradient
 * over nothing.
 */
defineProps({
  as: { type: String, required: false, default: 'li' },
})
</script>

<template>
  <component
    :is="as"
    class="
      flex h-full w-full max-w-full flex-col overflow-hidden rounded-xl
      bg-default ring ring-default
    "
  >
    <div class="relative bg-elevated">
      <div class="absolute start-3 top-3 z-10">
        <USkeleton class="h-5 w-12 rounded-md" />
      </div>
      <div class="absolute end-3 top-3 z-10 flex gap-1.5">
        <USkeleton class="size-7 rounded-md" />
        <USkeleton class="size-7 rounded-md" />
      </div>

      <div class="aspect-4/3 max-w-full">
        <USkeleton class="size-full rounded-none" />
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <USkeleton class="h-3 w-16" />

      <div class="flex flex-col gap-1.5">
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-2/3" />
      </div>

      <div class="flex items-center gap-1.5">
        <USkeleton class="h-3.5 w-20" />
        <USkeleton class="h-3 w-8" />
      </div>

      <div class="mt-auto pt-1">
        <USkeleton class="h-7 w-24" />
      </div>

      <USkeleton class="h-9 w-full rounded-md" />
    </div>
  </component>
</template>
