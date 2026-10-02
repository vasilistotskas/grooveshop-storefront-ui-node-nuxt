<script setup lang="ts">
// Props
const props = defineProps<{
  events: BoxNowParcelEvent[]
}>()

// Composables
const { t, locale } = useI18n()
const { presentationFor } = useBoxNowParcelState()

// Computed — `date` carries the raw ISO timestamp; rendering happens
// in the `#date` slot via <NuxtTime> for SSR-safe localised output.
const timelineItems = computed(() =>
  props.events.map((e) => {
    const presentation = presentationFor(e.eventType)
    return {
      title: presentation.label,
      description: e.displayName || e.postalCode || '',
      date: e.eventTime,
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
