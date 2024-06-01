<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="
      wrapper relative mb-6 mt-2 min-h-[calc(100vh-33rem)]

      md:mb-12 md:mt-4 md:min-h-[calc(100vh-25rem)]
    "
  >
    <slot />
  </div>
</template>
