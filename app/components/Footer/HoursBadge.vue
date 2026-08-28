<script lang="ts" setup>
const { t } = useI18n()
const { hasData, todayHours, isOpen } = useBusinessHours()
</script>

<template>
  <div
    v-if="hasData"
    class="
      flex items-center gap-2 text-sm text-primary-950
      dark:text-primary-100
    "
  >
    <UBadge
      :color="isOpen ? 'success' : 'error'"
      variant="subtle"
      size="sm"
    >
      {{ isOpen ? t('open_now') : t('closed_now') }}
    </UBadge>
    <span
      v-if="todayHours"
      class="tabular-nums"
    >{{ t('today') }} {{ todayHours.opens }}–{{ todayHours.closes }}</span>
  </div>
</template>

<i18n lang="yaml">
el:
  open_now: Ανοιχτά τώρα
  closed_now: Κλειστά τώρα
  today: Σήμερα
</i18n>
