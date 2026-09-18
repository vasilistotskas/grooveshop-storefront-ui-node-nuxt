<script lang="ts" setup>
/**
 * A rule between two bands.
 *
 * `padding="none"` because the bands on either side already own their
 * vertical rhythm; a divider that added its own would read as a gap
 * rather than a join.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  variant?: 'line' | 'thread'
}>()
</script>

<template>
  <PageSectionBand padding="none">
    <hr
      v-if="variant === 'thread'"
      aria-hidden="true"
      class="woven-thread"
    >
    <USeparator v-else />
  </PageSectionBand>
</template>
