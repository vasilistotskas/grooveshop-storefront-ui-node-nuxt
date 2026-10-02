<script lang="ts" setup>
/**
 * Whether the store is open right now — "Open now · until 20:00" — in
 * the footer. Green when open, muted when closed; the words say which,
 * so the colour is never the only signal.
 */
const { t } = useI18n()
const { hasData, todayHours, isOpen } = useBusinessHours()
</script>

<template>
  <p
    v-if="hasData"
    :class="[
      'flex items-center gap-2 text-sm font-bold',
      isOpen ? 'text-success' : 'text-muted',
    ]"
  >
    <span
      aria-hidden="true"
      class="size-2 shrink-0 rounded-full bg-current"
    />
    <span v-if="isOpen">
      {{ t('open_now') }}<template v-if="todayHours"> · <span class="tabular-nums">{{ t('until', { time: todayHours.closes }) }}</span></template>
    </span>
    <span v-else>
      {{ t('closed_now') }}<template v-if="todayHours"> · <span class="tabular-nums">{{ t('today', { opens: todayHours.opens, closes: todayHours.closes }) }}</span></template>
    </span>
  </p>
</template>

<i18n lang="yaml">
el:
  open_now: Ανοιχτά τώρα
  closed_now: Κλειστά τώρα
  until: 'έως {time}'
  today: 'Σήμερα {opens}–{closes}'
en:
  open_now: Open now
  closed_now: Closed now
  until: 'until {time}'
  today: 'Today {opens}–{closes}'
</i18n>
