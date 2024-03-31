<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <header class="relative z-20">
    <slot />
  </header>
</template>
