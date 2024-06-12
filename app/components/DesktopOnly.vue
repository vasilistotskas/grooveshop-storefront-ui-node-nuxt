<template>
  <div v-if="isDesktop">
    <slot />
  </div>
</template>

<script lang="ts" setup>
const { isDesktop } = useDevice()
</script>
