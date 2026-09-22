<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <!-- The frame owns the air above the footer (the footer has no
       margin of its own, so a page of bands can end flush against
       it); `mb-16` is the same 4rem the listings pad their bottom
       with, so every content page ends on the same breath. -->
  <UContainer
    class="
      relative mt-2 mb-16
      md:mt-4
    "
  >
    <slot />
  </UContainer>
</template>
