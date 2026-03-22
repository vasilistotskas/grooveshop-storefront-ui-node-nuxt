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
      root: 'border-b-0 h-auto',
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
