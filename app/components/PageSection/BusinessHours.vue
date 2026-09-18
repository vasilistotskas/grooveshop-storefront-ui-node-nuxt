<script lang="ts" setup>
/**
 * The week's opening hours, with today marked and an open/closed badge.
 *
 * The schedule is the `BUSINESS_HOURS` merchant setting, so the section
 * carries no props of its own beyond where it sits on the page.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  surface?: 'default' | 'muted'
}>()

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
  <PageSectionBand
    v-if="hasData"
    :surface="surface"
  >
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2
          class="
            font-display text-2xl font-semibold tracking-tight text-highlighted
            md:text-3xl
          "
        >
          {{ title || t('title') }}
        </h2>
        <UBadge
          :color="isOpen ? 'success' : 'error'"
          variant="subtle"
          size="lg"
        >
          <span
            aria-hidden="true"
            class="size-2 animate-pulse rounded-full bg-current"
          />
          {{ isOpen ? t('open_now') : t('closed_now') }}
        </UBadge>
      </div>
    </template>

    <ul class="grid max-w-xl gap-1">
      <li
        v-for="row in rows"
        :key="row.day"
        class="flex items-center justify-between rounded-md px-3 py-2"
        :class="row.isToday ? 'bg-elevated font-semibold text-highlighted' : ''"
      >
        <span>{{ row.label }}</span>
        <span
          v-if="row.entry"
          class="font-mono tabular-nums"
        >{{ row.entry.opens }}–{{ row.entry.closes }}</span>
        <span
          v-else
          class="text-dimmed"
        >{{ t('closed') }}</span>
      </li>
    </ul>
  </PageSectionBand>
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
