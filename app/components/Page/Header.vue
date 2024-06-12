<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <header class="fixed left-0 right-0 top-0 z-50 w-full">
    <slot />
  </header>
</template>
