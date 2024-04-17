<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="supports-backdrop-blur:bg-primary-100/60 dark:bg-primary-900 bg-primary-100 overflow-y-auto rounded p-4 backdrop-blur"
  >
    <slot />
  </div>
</template>
