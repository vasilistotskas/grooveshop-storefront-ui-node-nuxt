<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    default: '',
  },
})
defineSlots<{
  default(props: {}): any
}>()
</script>

<template>
  <div
    class="text-primary-700 dark:text-primary-100 text-center text-xs font-bold"
  >
    <slot>{{ text }}</slot>
  </div>
</template>
