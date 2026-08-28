<script lang="ts" setup>
defineProps<{
  title?: string
  content?: string
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
    <div
      v-if="content"
      class="article prose dark:prose-invert"
      v-html="content"
    />
  </div>
</template>
