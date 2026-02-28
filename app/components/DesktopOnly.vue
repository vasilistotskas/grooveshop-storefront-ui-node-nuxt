<template>
  <ClientOnly>
    <div v-if="isDesktop">
      <slot />
    </div>
  </ClientOnly>
</template>

<script lang="ts" setup>
const { isDesktop } = useDevice()
</script>
