<script lang="ts" setup>
const { t } = useI18n()
</script>

<template>
  <div
    class="
      flex items-center justify-center gap-2 text-center text-red-800
      dark:text-red-300
    "
  >
    <UIcon name="i-heroicons-exclamation-triangle" />
    <span
      class="
        text-xs
        md:text-sm
      "
    >{{ t('demo.message') }}</span>
  </div>
</template>

<i18n lang="yaml">
el:
  demo:
    message: Για σκοπούς προβολής μόνο (DEMO).
</i18n>
