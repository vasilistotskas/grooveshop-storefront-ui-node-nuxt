<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <UHeader
    :toggle="false"
    title=""
    :ui="{
      root: 'h-auto border-b-0',
      container: `
        max-w-full px-0
        sm:px-0
        lg:px-0
      `,
      left: 'hidden',
      center: 'flex w-full',
      right: 'hidden',
    }"
  >
    <slot />
  </UHeader>
</template>
