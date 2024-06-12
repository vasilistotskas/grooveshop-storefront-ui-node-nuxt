<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="
      card-footer bg-primary-100 border-t border-primary-500 px-6 py-2 text-sm

      dark:bg-primary-900 dark:border-primary-500
    "
  >
    <slot />
  </div>
</template>
