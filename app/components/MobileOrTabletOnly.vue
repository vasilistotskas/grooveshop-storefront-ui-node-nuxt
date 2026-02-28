<template>
  <template v-if="isMobileOrTablet">
    <slot />
  </template>
</template>

<script lang="ts" setup>
const { isMobileOrTablet } = useDevice()
</script>
