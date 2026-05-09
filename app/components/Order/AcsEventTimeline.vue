<script setup lang="ts">
// Props
const props = defineProps<{
  events: AcsTrackingEvent[]
}>()

// Composables
const { t } = useI18n()

// Computed — ACS events come straight from polling, so we render the
// raw checkpoint_action / checkpoint_location text the courier
// returned. Date formatting reuses the shared util.
const timelineItems = computed(() =>
  props.events.map(e => ({
    title: e.checkpointAction,
    description: e.checkpointLocation || e.notes || '',
    date: formatDate(e.eventTime),
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
    />
  </div>
</template>
