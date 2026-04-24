<script lang="ts" setup>
/**
 * "Secure checkout" seal — small inline lock icon + SSL copy.
 *
 * Signals SSL/HTTPS protection during checkout. The ``compact`` prop is
 * kept for callers that want to opt out of longer trust copy in tight
 * layouts, even though we currently render the same content either way.
 */

const { t } = useI18n()

defineProps<{
  compact?: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
    <UIcon
      name="i-heroicons-lock-closed"
      class="h-4 w-4 shrink-0 text-success"
      aria-hidden="true"
    />
    <span class="font-semibold text-neutral-800 dark:text-neutral-100">
      {{ t('title') }}
    </span>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Ασφαλής πληρωμή SSL
</i18n>
