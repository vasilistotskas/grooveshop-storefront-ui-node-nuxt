<script lang="ts" setup>
/**
 * The week's opening hours as a card beside webside's contact form: today
 * in bold, an "Open now" badge, a closed day said as closed. The schedule is
 * the `BUSINESS_HOURS` setting; a store without one renders nothing.
 * Today's mark and the badge depend on the clock, so they appear once the
 * page is mounted; the server HTML carries the table alone.
 */
const { t } = useStoreI18n('components/variants/webside/Contact/HoursCard')
const { hasData, isOpen, rows } = useOpeningHoursRows(day => t(`days.${day}`))
</script>

<template>
  <UCard
    v-if="hasData"
    as="section"
    :aria-label="t('title')"
    class="shadow-lg"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-primary-950 dark:text-primary-50">
          {{ t('title') }}
        </h2>
        <UBadge
          v-if="isOpen !== null"
          :color="isOpen ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
        >
          <span
            aria-hidden="true"
            class="size-1.5 rounded-full bg-current"
          />
          {{ isOpen ? t('open_now') : t('closed_now') }}
        </UBadge>
      </div>
    </template>

    <ul class="flex flex-col gap-2.5 text-sm">
      <li
        v-for="row in rows"
        :key="row.day"
        class="flex items-center justify-between gap-4"
        :class="row.isToday
          ? 'font-semibold text-primary-950 dark:text-primary-50'
          : 'text-primary-700 dark:text-primary-200'"
        :aria-current="row.isToday ? 'date' : undefined"
      >
        <span>{{ row.label }}</span>
        <span
          v-if="row.entry"
          class="font-mono tabular-nums"
        >{{ row.entry.opens }}–{{ row.entry.closes }}</span>
        <span
          v-else
          class="font-mono text-primary-500 dark:text-primary-400"
        >{{ t('closed') }}</span>
      </li>
    </ul>
  </UCard>
</template>

<i18n lang="yaml">
el:
  title: Ωράριο λειτουργίας
  open_now: Ανοιχτά τώρα
  closed_now: Κλειστά τώρα
  closed: Κλειστά
  days:
    mon: Δευτέρα
    tue: Τρίτη
    wed: Τετάρτη
    thu: Πέμπτη
    fri: Παρασκευή
    sat: Σάββατο
    sun: Κυριακή
en:
  title: Opening hours
  open_now: Open now
  closed_now: Closed now
  closed: Closed
  days:
    mon: Monday
    tue: Tuesday
    wed: Wednesday
    thu: Thursday
    fri: Friday
    sat: Saturday
    sun: Sunday
</i18n>
