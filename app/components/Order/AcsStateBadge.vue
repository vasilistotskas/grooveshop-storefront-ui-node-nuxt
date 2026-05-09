<script setup lang="ts">
// Props — typed as ``string`` so unknown Django states fall back
// to the composable's neutral preset instead of a TypeScript-narrowed
// runtime crash.
const props = defineProps<{
  state: string
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
