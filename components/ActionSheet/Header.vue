<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    default: '',
  },
})
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="text-primary-950 dark:text-primary-50 text-center text-xs font-bold"
  >
    <slot>{{ text }}</slot>
  </div>
</template>
