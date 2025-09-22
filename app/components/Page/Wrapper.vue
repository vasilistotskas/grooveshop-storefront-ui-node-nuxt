<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <UContainer
    class="
      wrapper relative mt-2 mb-6 min-h-[calc(100vh-29.5rem)]
      md:mt-4 md:mb-12 md:min-h-[calc(100vh-25rem)]
    "
  >
    <slot />
  </UContainer>
</template>
