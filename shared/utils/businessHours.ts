/**
 * Pure helpers behind ``useBusinessHours`` — kept out of the composable
 * so the timezone/boundary logic is unit-testable without a Nuxt
 * context.
 */

/**
 * Parse the raw ``/api/settings/get`` value for ``BUSINESS_HOURS``.
 * Empty, non-JSON, ``{}`` or shape-invalid payloads all resolve to
 * ``null`` (feature unset) — never a throw.
 */
export function parseBusinessHoursValue(
  raw: string | null | undefined,
): BusinessHours | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return null
  }
  if (
    !parsed
    || typeof parsed !== 'object'
    || Object.keys(parsed).length === 0
  ) {
    return null
  }
  return isBusinessHours(parsed) ? parsed : null
}

export interface BusinessHoursState {
  day: WeekDayKey
  time: string
  todayHours: BusinessHoursDayEntry
  isOpen: boolean
}

/**
 * The open/closed state of ``hours`` at instant ``at``, computed in the
 * STORE's timezone (minute-accurate). ``null`` when the timezone is
 * unknown to ``Intl`` — historical data predating write-side
 * validation.
 */
export function resolveBusinessHoursState(
  hours: BusinessHours,
  at: Date,
): BusinessHoursState | null {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: hours.timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(at)
  }
  catch {
    return null
  }
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? ''
  const day = part('weekday').toLowerCase().slice(0, 3) as WeekDayKey
  if (!WEEK_DAY_KEYS.includes(day)) return null
  const time = `${part('hour')}:${part('minute')}`
  const todayHours = hours.schedule[day]
  // Zero-padded HH:MM compares correctly as strings.
  const isOpen = todayHours !== null
    && time >= todayHours.opens
    && time < todayHours.closes
  return { day, time, todayHours, isOpen }
}
