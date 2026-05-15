<script setup lang="ts">
// Props
const props = defineProps<{
  events: AcsTrackingEvent[]
}>()

// Composables
const { t, locale } = useI18n()

// Computed — ACS events come straight from polling, so we render the
// raw checkpoint_action / checkpoint_location text the courier
// returned. Date carries the raw ISO timestamp and is formatted via
// <NuxtTime> in the #date slot below.
const timelineItems = computed(() =>
  props.events.map(e => ({
    title: e.checkpointAction,
    description: e.checkpointLocation || e.notes || '',
    date: e.eventTime,
    icon: 'i-lucide-truck',
    value: e.checkpointAction,
  })),
)
</script>

<template>
  <div>
    <UAlert
      v-if="events.length === 0"
      :title="t('tracking.acs.no_events')"
      variant="subtle"
      icon="i-lucide-clock"
      color="neutral"
    />
    <UTimeline
      v-else
      orientation="vertical"
      :items="timelineItems"
      size="md"
    >
      <template #date="{ item }">
        <NuxtTime
          :datetime="item.date"
          :locale="locale"
          date-style="medium"
          time-style="short"
        />
      </template>
    </UTimeline>
  </div>
</template>
