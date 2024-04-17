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
  <div class="text-2xl font-bold md:text-4xl">
    <h2 class="text-primary-950 dark:text-primary-50">
      <slot>{{ text }}</slot>
    </h2>
  </div>
</template>
