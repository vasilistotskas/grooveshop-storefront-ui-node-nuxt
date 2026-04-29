<script setup lang="ts">
// Props
const props = defineProps<{
  state: AcsShipmentStateValue
}>()

// Composables
const { presentationFor } = useAcsShipmentState()

// Computed
const presentation = computed(() => presentationFor(props.state))
</script>

<template>
  <UBadge
    :color="presentation.color"
    :icon="presentation.icon"
    :label="presentation.label"
    variant="subtle"
    size="md"
  />
</template>
