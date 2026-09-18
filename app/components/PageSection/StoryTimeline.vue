<script lang="ts" setup>
import type { TimelineItem } from '@nuxt/ui'

/**
 * How the store got here, or how an order gets to the customer.
 *
 * Every step renders as reached: this is a story or a process, not a
 * progress tracker with a current position.
 */
const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  items?: Array<{
    title: string
    date?: string
    text?: string
    icon?: string
  }>
  surface?: 'default' | 'muted'
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

const lastValue = computed(() => timelineItems.value.length - 1)
</script>

<template>
  <PageSectionBand
    v-if="timelineItems.length"
    :heading="heading || title"
    :subheading="subheading"
    :surface="surface"
  >
    <!-- Flush-left with the heading above it: centred, the steps
         started ~240px right of their own h2 and read as an unrelated
         block. The max width keeps the measure comfortable. -->
    <UTimeline
      :items="timelineItems"
      :default-value="lastValue"
      color="secondary"
      size="lg"
      class="w-full max-w-2xl"
      :ui="{
        title: 'font-display text-base font-semibold text-highlighted',
        description: 'text-sm text-muted',
        date: 'text-secondary',
      }"
    />
  </PageSectionBand>
</template>
