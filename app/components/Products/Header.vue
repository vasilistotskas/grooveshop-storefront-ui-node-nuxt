<script lang="ts" setup>
/**
 * A listing's title and its one-line description.
 *
 * The title is optional because a store's own page layout can carry the
 * page heading instead (the products page's branded sections).
 */
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <h1
      v-if="title"
      class="
        font-display text-[2rem]/[1.05] font-bold tracking-tight
        text-highlighted
        lg:text-5xl/[1.05]
      "
    >
      {{ title }}
    </h1>
    <p
      v-if="description"
      class="max-w-160 text-[0.9375rem] text-muted lg:text-[1.0625rem]"
    >
      {{ description }}
    </p>
  </div>
</template>
