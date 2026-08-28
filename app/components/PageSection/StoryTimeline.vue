<script lang="ts" setup>
import type { TimelineItem } from '@nuxt/ui'

const props = defineProps<{
  title?: string
  heading?: string
  items?: Array<{
    title: string
    date?: string
    text?: string
    icon?: string
  }>
}>()

const timelineItems = computed<TimelineItem[]>(() =>
  (props.items ?? []).map((item, index) => ({
    value: index,
    title: item.title,
    date: item.date,
    description: item.text,
    icon: item.icon ?? 'i-heroicons-sparkles',
  })),
)

// Every step rendered as "reached": this is a story/process, not a
// progress tracker with a current position.
const lastValue = computed(() => timelineItems.value.length - 1)
</script>

<template>
  <div
    v-if="timelineItems.length"
    class="w-full"
  >
    <h2
      v-if="heading"
      class="
        font-display mb-8 text-2xl font-bold text-balance
        md:text-3xl
      "
    >
      {{ heading }}
    </h2>
    <!-- Flush-left with the heading above it: centered, the steps
         started ~240px right of their own h2 and read as an unrelated
         block. max-w keeps the measure comfortable. -->
    <UTimeline
      :items="timelineItems"
      :default-value="lastValue"
      color="secondary"
      size="lg"
      class="w-full max-w-2xl"
      :ui="{
        title: 'font-display text-base font-semibold',
        date: 'text-(--ui-secondary)',
      }"
    />
  </div>
</template>
