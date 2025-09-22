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
    class="
      flex flex-col items-center justify-center rounded-lg border
      border-primary-500 p-16
      dark:border-primary-500
    "
  >
    <p
      class="
        text-center text-primary-950
        dark:text-primary-50
      "
    >
      {{ text }}
    </p>
  </div>
</template>
