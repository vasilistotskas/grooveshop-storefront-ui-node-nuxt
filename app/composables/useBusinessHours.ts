/**
 * THE reader for the ``BUSINESS_HOURS`` extra_setting — weekly
 * schedule plus a live, timezone-correct open/closed state.
 *
 * Fail-open chrome: no setting, an empty ``{}`` payload, a shape the
 * ``zBusinessHours`` parse rejects, or an ``Intl``-unknown timezone all
 * resolve to ``hasData === false`` and every consumer renders nothing —
 * a data hiccup never breaks the page.
 *
 * The open/closed check is minute-accurate in the STORE's timezone
 * (see ``resolveBusinessHoursState``) on a ``useNow`` minute tick, so
 * a visitor's local clock never shifts the badge.
 */
export function useBusinessHours() {
  const { data } = useFetch<{ value?: string }>('/api/settings/get', {
    key: 'setting-json:BUSINESS_HOURS',
    query: { key: 'BUSINESS_HOURS' },
    default: () => ({ value: '' }),
  })

  const hours = computed<BusinessHours | null>(() => {
    const raw = data.value?.value
    if (!raw) return null
    const parsed = parseBusinessHoursValue(raw)
    if (parsed === null && raw !== '{}') {
      log.warn({
        tag: 'business-hours',
        message: 'BUSINESS_HOURS setting failed zBusinessHours parse',
      })
    }
    return parsed
  })

  const now = useNow({ interval: 60_000 })

  const state = computed(() =>
    hours.value ? resolveBusinessHoursState(hours.value, now.value) : null,
  )

  return {
    hasData: computed(() => state.value !== null),
    schedule: computed(() => hours.value?.schedule ?? null),
    timezone: computed(() => hours.value?.timezone ?? null),
    today: computed(() => state.value?.day ?? null),
    todayHours: computed(() => state.value?.todayHours ?? null),
    isOpen: computed(() => state.value?.isOpen ?? false),
  }
}
