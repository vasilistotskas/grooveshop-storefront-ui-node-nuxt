<script lang="ts" setup>
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
    class="w-full"
  >
    <div
      class="
        rounded-lg bg-neutral-50 p-6
        dark:bg-neutral-800
      "
    >
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-2xl font-bold">
          {{ t('title') }}
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
      <ul class="grid gap-1">
        <li
          v-for="row in rows"
          :key="row.day"
          class="
            flex items-center justify-between rounded-md px-3 py-2
          "
          :class="
            row.isToday
              ? `
                bg-(--ui-color-secondary-500)/10 font-semibold
              `
              : ''
          "
        >
          <span>{{ row.label }}</span>
          <span
            v-if="row.entry"
            class="tabular-nums"
          >{{ row.entry.opens }}–{{ row.entry.closes }}</span>
          <span
            v-else
            class="text-neutral-500 dark:text-neutral-400"
          >{{ t('closed') }}</span>
        </li>
      </ul>
    </div>
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
</i18n>
