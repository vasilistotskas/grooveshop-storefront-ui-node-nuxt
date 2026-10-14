/**
 * THE reader for the ``BUSINESS_HOURS`` extra_setting — weekly
 * schedule plus a live, timezone-correct open/closed state.
 *
 * Fail-open chrome: no setting, an empty ``{}`` payload, a shape the
 * ``isBusinessHours`` rejects, or an ``Intl``-unknown timezone all
 * resolve to ``hasData === false`` and every consumer renders nothing —
 * a data hiccup never breaks the page.
 *
 * The open/closed check is minute-accurate in the STORE's timezone
 * (see ``resolveBusinessHoursState``) on a ``useNow`` minute tick, so
 * a visitor's local clock never shifts the badge.
 *
 * The clock-dependent fields (``today``, ``todayHours``, ``isOpen``) are
 * ``null`` on the server and through hydration, and fill in once the
 * component has mounted. Pages are served from Nitro's cache for minutes
 * after they were rendered, so a server-side clock is stale by the time
 * the visitor reads it (and at every opening time, closing time and
 * midnight it contradicts the client's, which is a hydration mismatch).
 * The schedule, timezone and ``hasData`` do not depend on the clock and
 * stay in the server HTML.
 */
export function useBusinessHours() {
  const value = useSettingValue('BUSINESS_HOURS')

  const hours = computed<BusinessHours | null>(() => {
    const raw = value.value
    if (!raw) return null
    const parsed = parseBusinessHoursValue(raw)
    if (parsed === null && raw !== '{}') {
      log.warn({
        tag: 'business-hours',
        message: 'BUSINESS_HOURS setting failed shape validation',
      })
    }
    return parsed
  })

  const now = useNow({ scheduler: update => useIntervalFn(update, 60_000) })

  const mounted = useMounted()

  const state = computed(() =>
    mounted.value && hours.value
      ? resolveBusinessHoursState(hours.value, now.value)
      : null,
  )

  return {
    hasData: computed(() =>
      hours.value !== null && isBusinessHoursTimezoneKnown(hours.value),
    ),
    schedule: computed(() => hours.value?.schedule ?? null),
    timezone: computed(() => hours.value?.timezone ?? null),
    today: computed(() => state.value?.day ?? null),
    todayHours: computed(() => state.value?.todayHours ?? null),
    isOpen: computed(() => state.value?.isOpen ?? null),
  }
}
