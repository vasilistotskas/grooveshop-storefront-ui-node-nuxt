<script lang="ts" setup>
/**
 * An order's status as a pill: Django's own translated label
 * (`statusDisplay`) on the tint `orderStatusColor` gives the status.
 */
defineProps<{
  status?: OrderStatus
  label: string
}>()
</script>

<template>
  <UBadge
    :label="label"
    :color="orderStatusColor(status)"
    variant="soft"
  />
</template>
