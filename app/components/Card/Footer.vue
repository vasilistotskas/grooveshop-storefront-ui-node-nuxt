<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="
      card-footer bg-primary-100 border-primary-500

      dark:bg-primary-900 dark:border-primary-500

      border-t px-6 py-2 text-sm
    "
  >
    <slot />
  </div>
</template>
