<script lang="ts" setup>
defineProps({
	disabled: {
		type: Boolean,
		required: false
	}
})
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
  <div
    class="card relative w-full overflow-hidden rounded border border-gray-900/10 bg-white transition-colors duration-300 dark:border-gray-50/[0.2] dark:bg-zinc-900"
  >
    <div
      v-if="disabled"
      class="absolute left-0 top-0 z-10 h-full w-full cursor-not-allowed bg-zinc-800/[0.75]"
    />
    <slot />
  </div>
</template>
