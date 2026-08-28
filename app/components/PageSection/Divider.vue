<script lang="ts" setup>
defineProps<{
  title?: string
  variant?: 'line' | 'thread'
}>()
</script>

<template>
  <div class="w-full">
    <hr
      v-if="variant === 'thread'"
      aria-hidden="true"
      class="woven-thread"
    >
    <USeparator v-else />
  </div>
</template>
