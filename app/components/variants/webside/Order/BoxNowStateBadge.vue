<script setup lang="ts">
// Props — ``state`` is typed as ``string`` (not the local enum) so
// unknown BoxNow states (``in-transit``, ``wait-for-load``, …) reach
// the composable's fallback path instead of TypeScript-narrowing
// off a runtime crash.
const props = defineProps<{
  state: string
}>()

// Composables
const { presentationFor } = useBoxNowParcelState()

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
