<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <UContainer
    class="
      relative mt-2 mb-6
      md:mt-4 md:mb-12
    "
  >
    <slot />
  </UContainer>
</template>
