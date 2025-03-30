<script setup lang="ts">
const { $i18n } = useNuxtApp()
</script>

<template>
  <div
    class="
      demo-mode-message flex items-center justify-center gap-2 text-center
      text-red-800

      dark:text-red-300
    "
  >
    <UIcon name="i-heroicons-exclamation-triangle" />
    <span
      class="
        text-xs

        md:text-sm
      "
    >{{ $i18n.t('demo.message') }}</span>
  </div>
</template>

<style scoped>
.demo-mode-message {
  grid-row: 2;
  grid-column: 1 / span 2;
}
</style>
