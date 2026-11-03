/**
 * The week's opening hours as the contact page's card prints them, one row
 * per day, for every design: today marked and an "open now" state, a closed
 * day as `entry: null`. The schedule is the `BUSINESS_HOURS` setting; a store
 * without one has `hasData === false` and no rows.
 *
 * Today and `isOpen` depend on the clock, so they are `null` until the page
 * is mounted (see `useBusinessHours`); the server HTML carries the table
 * alone.
 *
 * @param label the day's name in the card's own language
 */
export function useOpeningHoursRows(label: (day: WeekDayKey) => string) {
  const { hasData, schedule, today, isOpen } = useBusinessHours()

  const rows = computed(() => {
    if (!schedule.value) return []
    return WEEK_DAY_KEYS.map(day => ({
      day,
      label: label(day),
      entry: schedule.value?.[day] ?? null,
      isToday: day === today.value,
    }))
  })

  return { hasData, isOpen, rows }
}
