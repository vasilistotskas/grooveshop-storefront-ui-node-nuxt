<script lang="ts" setup>
defineSlots<{
  default(props: {}): any
}>()
</script>

<template>
  <div
    class="card-footer border-t border-gray-900/10 bg-white px-6 py-2 text-sm dark:border-gray-50/[0.2] dark:bg-zinc-800"
  >
    <slot />
  </div>
</template>
