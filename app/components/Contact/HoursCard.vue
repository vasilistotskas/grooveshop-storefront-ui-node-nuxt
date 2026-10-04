<script lang="ts" setup>
/**
 * The week's opening hours as a card beside the contact form: today in
 * bold, an "Open now" badge, a closed day said as closed. The schedule
 * is the `BUSINESS_HOURS` setting; a store without one renders nothing.
 *
 * (`PageSection/BusinessHours` is the page builder's full-width band of
 * the same data; this is the contact page's own, smaller card.)
 */
const { t } = useI18n()
const { hasData, schedule, today, isOpen } = useBusinessHours()

const rows = computed(() => {
  if (!schedule.value) return []
  return WEEK_DAY_KEYS.map(day => ({
    day,
    label: t(`days.${day}`),
    entry: schedule.value?.[day] ?? null,
    isToday: day === today.value,
  }))
})
</script>

<template>
  <section
    v-if="hasData"
    :aria-label="t('title')"
    class="
      flex flex-col gap-4 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
  >
    <div class="flex items-center justify-between gap-3">
      <h2 class="font-semibold text-highlighted">
        {{ t('title') }}
      </h2>
      <UBadge
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

    <ul class="flex flex-col gap-2.5 text-sm">
      <li
        v-for="row in rows"
        :key="row.day"
        class="flex items-center justify-between gap-4"
        :class="row.isToday ? 'font-semibold text-highlighted' : 'text-default'"
        :aria-current="row.isToday ? 'date' : undefined"
      >
        <span>{{ row.label }}</span>
        <span
          v-if="row.entry"
          class="font-mono tabular-nums"
        >{{ row.entry.opens }}–{{ row.entry.closes }}</span>
        <span
          v-else
          class="font-mono text-toned"
        >{{ t('closed') }}</span>
      </li>
    </ul>
  </section>
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
