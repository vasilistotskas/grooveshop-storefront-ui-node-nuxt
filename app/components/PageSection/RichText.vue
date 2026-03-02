<script lang="ts" setup>
defineProps<{
  title?: string
  content?: string
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
    <div
      v-if="content"
      class="article prose dark:prose-invert"
      v-html="content"
    />
  </div>
</template>
