<script lang="ts" setup>
defineProps({
  disabled: {
    type: Boolean,
    required: false,
  },
})
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <div
    class="
      card bg-primary-100 relative w-full overflow-hidden rounded border
      border-gray-900/10 transition-colors duration-300

      dark:bg-primary-900 dark:border-gray-50/[0.2]
    "
  >
    <div
      v-if="disabled"
      class="
        bg-primary-800/[0.75] absolute left-0 top-0 z-10 h-full w-full
        cursor-not-allowed
      "
    />
    <slot />
  </div>
</template>
