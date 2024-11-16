<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div class="card-content relative p-6">
    <slot />
  </div>
</template>
