<template>
  <ClientOnly>
    <template v-if="isMobileOrTablet">
      <slot />
    </template>
  </ClientOnly>
</template>

<script lang="ts" setup>
const { isMobileOrTablet } = useDevice()
</script>
