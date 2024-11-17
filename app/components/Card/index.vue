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
      card bg-primary-100 border-primary-500 relative w-full overflow-hidden
      rounded border transition-colors duration-300

      dark:bg-primary-900 dark:border-primary-500
    "
  >
    <div
      v-if="disabled"
      class="
        bg-primary-800/[0.75] absolute left-0 top-0 z-10 size-full
        cursor-not-allowed
      "
    />
    <slot />
  </div>
</template>
