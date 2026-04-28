<script setup lang="ts">
// Props
const props = defineProps<{
  events: BoxNowParcelEvent[]
}>()

// Composables
const { t } = useI18n()
const { presentationFor } = useBoxNowParcelState()

// Computed
const timelineItems = computed(() =>
  props.events.map((e) => {
    const presentation = presentationFor(e.eventType as BoxNowParcelStateValue)
    return {
      title: presentation.label,
      description: e.displayName || e.postalCode || '',
      date: formatDate(e.eventTime),
      icon: presentation.icon,
      value: presentation.label,
    }
  }),
)
</script>

<template>
  <div>
    <UAlert
      v-if="events.length === 0"
      :title="t('tracking.boxnow.no_events')"
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
