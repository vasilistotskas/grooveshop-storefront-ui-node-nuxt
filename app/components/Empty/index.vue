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
      border-primary-500

      dark:border-primary-500

      flex flex-col items-center justify-center rounded-lg border p-16
    "
  >
    <p
      class="
        text-primary-950

        dark:text-primary-50

        text-center
      "
    >
      {{ text }}
    </p>
  </div>
</template>
