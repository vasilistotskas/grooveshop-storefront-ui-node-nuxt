<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-gray-900/10 p-16 dark:border-gray-50/[0.2]"
  >
    <p class="text-primary-800 dark:text-primary-100 text-center">
      {{ text }}
    </p>
  </div>
</template>
