<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div class="card-content relative px-6 py-6">
    <slot />
  </div>
</template>
