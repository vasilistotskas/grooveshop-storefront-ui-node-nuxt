<script lang="ts" setup>
/**
 * "Silver · 2.340 points" under the shopper's name in the phone menu.
 *
 * Its own component so the summary is requested only on a loyalty
 * store: the parent renders it behind both loyalty gates.
 */
const { t, n, locale } = useI18n()
const { data: summary } = useLoyalty().fetchSummary()

const tierName = computed(() =>
  summary.value?.tier
    ? extractTranslated(summary.value.tier, 'name', locale.value)
    : undefined,
)
</script>

<template>
  <span
    v-if="summary"
    class="truncate text-xs text-muted"
  >
    <template v-if="tierName">{{ tierName }} · </template>{{ t('points', { count: n(summary.pointsBalance) }, summary.pointsBalance) }}
  </span>
</template>

<i18n lang="yaml">
el:
  points: '{count} πόντος | {count} πόντοι'
en:
  points: '{count} point | {count} points'
</i18n>
