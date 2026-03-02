<script lang="ts" setup>
defineProps<{
  title?: string
  items?: Array<{ name: string, text: string, avatar?: string }>
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
      v-if="items?.length"
      class="grid gap-6 md:grid-cols-3"
    >
      <div
        v-for="(item, idx) in items"
        :key="idx"
        class="rounded-lg bg-neutral-50 p-6 dark:bg-neutral-800"
      >
        <p class="testimonial-text text-neutral-600 dark:text-neutral-300">
          {{ item.text }}
        </p>
        <p class="mt-4 font-semibold">
          {{ item.name }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.testimonial-text::before {
  content: '\201C';
}
.testimonial-text::after {
  content: '\201D';
}
</style>
