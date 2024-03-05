<script lang="ts" setup>
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
  <div class="wrapper relative mb-12 mt-4 min-h-[calc(100vh-30rem)]">
    <slot />
  </div>
</template>
