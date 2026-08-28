<script lang="ts" setup>
defineProps<{
  title?: string
  count?: number
}>()
</script>

<template>
  <div class="w-full">
    <h2
      v-if="title"
      class="mb-4 text-2xl font-bold"
    >
      {{ title }}
    </h2>
    <LazyBlogPostsList
      :page-size="count || 6"
      :show-ordering="false"
      pagination-type="cursor"
      hydrate-on-visible
    />
  </div>
</template>
