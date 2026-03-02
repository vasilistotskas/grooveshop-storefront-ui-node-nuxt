<script lang="ts" setup>
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-(--container-main) md:!p-0">
    <h2
      v-if="title"
      class="mb-4 text-2xl font-bold"
    >
      {{ title }}
    </h2>
    <ProductsList />
  </div>
</template>
