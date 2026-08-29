/**
 * Render-time contract for the ``BUSINESS_HOURS`` extra_setting.
 *
 * Write-side mirror: ``tenant/validators.py::
 * validate_business_hours_setting`` in the Django repo — keep the two
 * in sync. All seven day keys are required; ``null`` means closed that
 * day. The timezone is IANA-validated at the write boundary; render
 * code must still try/catch its ``Intl`` usage against historical data.
 *
 * Deliberately ZOD-FREE: ``app.vue`` (the entry chunk) reads this
 * setting on every page via ``useBusinessHours``, and a zod import here
 * dragged the whole zod runtime (16KB brotli) into every page's
 * critical JS graph (found in the 2026-08-29 mobile-perf pass). The
 * shape is small and closed, so ``isBusinessHours`` hand-implements the
 * exact semantics of the previous ``zBusinessHours`` schema: strict
 * keys at both levels, ``HH:MM`` 24h times, ``opens < closes``,
 * nullable day entries, timezone 1–64 chars. The accept/reject matrix
 * is pinned by ``test/unit/shared/businessHours.spec.ts``.
 */

export const WEEK_DAY_KEYS = [
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
] as const

export type WeekDayKey = (typeof WEEK_DAY_KEYS)[number]

export type BusinessHoursDayEntry = {
  opens: string
  closes: string
} | null

export interface BusinessHours {
  timezone: string
  schedule: Record<WeekDayKey, BusinessHoursDayEntry>
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function isDayEntry(value: unknown): value is BusinessHoursDayEntry {
  if (value === null) return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Record<string, unknown>
  // strict: exactly opens + closes, nothing else
  if (Object.keys(entry).length !== 2) return false
  const { opens, closes } = entry
  return (
    typeof opens === 'string'
    && typeof closes === 'string'
    && TIME_RE.test(opens)
    && TIME_RE.test(closes)
    && opens < closes
  )
}

export function isBusinessHours(value: unknown): value is BusinessHours {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const outer = value as Record<string, unknown>
  // strict: exactly timezone + schedule, nothing else
  if (Object.keys(outer).length !== 2) return false
  const { timezone, schedule } = outer
  if (typeof timezone !== 'string' || timezone.length < 1 || timezone.length > 64) {
    return false
  }
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return false
  const days = schedule as Record<string, unknown>
  // strict: exactly the seven day keys, each a valid (nullable) entry
  if (Object.keys(days).length !== WEEK_DAY_KEYS.length) return false
  return WEEK_DAY_KEYS.every(day => day in days && isDayEntry(days[day]))
}
