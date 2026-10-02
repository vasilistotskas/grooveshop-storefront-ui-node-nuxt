<script lang="ts" setup>
/**
 * A labelled row of marks in the footer — the ways to pay. The label
 * sits above the marks in the desk footer's column and beside them,
 * at a fixed width, in the phone footer's rows (`inline`).
 */
withDefaults(defineProps<{
  label: string
  marks: string[]
  inline?: boolean
}>(), {
  inline: false,
})
</script>

<template>
  <div
    v-if="marks.length"
    class="flex flex-wrap items-center gap-1.5"
  >
    <span
      :class="[
        'text-xs font-bold tracking-wider text-muted uppercase',
        inline ? 'w-18' : 'mb-1 w-full',
      ]"
    >{{ label }}</span>
    <UBadge
      v-for="mark in marks"
      :key="mark"
      :label="mark"
      color="neutral"
      variant="outline"
    />
  </div>
</template>
