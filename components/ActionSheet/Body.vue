<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="supports-backdrop-blur:bg-white/60 overflow-y-auto rounded bg-white p-4 backdrop-blur dark:bg-zinc-900"
  >
    <slot />
  </div>
</template>
