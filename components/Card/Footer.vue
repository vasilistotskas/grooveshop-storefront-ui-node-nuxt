<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="card-footer dark:bg-primary-900 bg-primary-100 border-t border-gray-900/10 px-6 py-2 text-sm dark:border-gray-50/[0.2]"
  >
    <slot />
  </div>
</template>
