<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="
      bg-primary-100

      dark:bg-primary-900

      supports-backdrop-blur:bg-primary-100/60

      overflow-y-auto rounded p-4 backdrop-blur
    "
  >
    <slot />
  </div>
</template>
