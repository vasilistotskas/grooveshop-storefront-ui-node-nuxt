<script lang="ts" setup>
/**
 * The product card before its data arrives.
 *
 * Shaped like the card it stands in for — the same sunken photograph
 * tile, the same rows under it — so the grid does not reflow when the
 * products land. A generic box would move every card down the page the
 * moment it was replaced.
 */
defineProps({
  as: { type: String, required: false, default: 'li' },
})
</script>

<template>
  <component
    :is="as"
    class="
      flex w-full max-w-full min-w-0 flex-col gap-2.5
      sm:gap-3.5
    "
  >
    <div class="aspect-[4/3.4] overflow-hidden rounded-[0.875rem] bg-elevated">
      <USkeleton class="size-full rounded-none" />
    </div>

    <div class="flex flex-col gap-1 px-0.5">
      <USkeleton class="h-3 w-14" />
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-3.5 w-24" />
      <USkeleton class="mt-0.5 h-6 w-20" />
    </div>
  </component>
</template>
