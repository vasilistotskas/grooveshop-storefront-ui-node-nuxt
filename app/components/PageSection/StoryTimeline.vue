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
    class="mx-auto max-w-(--container-main) md:!p-0"
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
    <UTimeline
      :items="timelineItems"
      :default-value="lastValue"
      color="secondary"
      size="lg"
      class="mx-auto max-w-2xl"
      :ui="{
        title: 'font-display text-base font-semibold',
        date: 'text-(--ui-secondary)',
      }"
    />
  </div>
</template>
