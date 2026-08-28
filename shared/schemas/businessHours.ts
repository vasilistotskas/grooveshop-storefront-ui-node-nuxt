import * as z from 'zod'

/**
 * Render-time contract for the ``BUSINESS_HOURS`` extra_setting.
 *
 * Write-side mirror: ``tenant/validators.py::
 * validate_business_hours_setting`` in the Django repo — keep the two
 * in sync. All seven day keys are required; ``null`` means closed that
 * day. The timezone is IANA-validated at the write boundary; render
 * code must still try/catch its ``Intl`` usage against historical data.
 */

export const WEEK_DAY_KEYS = [
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
] as const

export type WeekDayKey = (typeof WEEK_DAY_KEYS)[number]

const zTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

const zDayEntry = z
  .object({ opens: zTime, closes: zTime })
  .strict()
  .refine(entry => entry.opens < entry.closes, {
    message: 'opens must precede closes',
  })
  .nullable()

export const zBusinessHours = z
  .object({
    timezone: z.string().min(1).max(64),
    schedule: z
      .object({
        mon: zDayEntry,
        tue: zDayEntry,
        wed: zDayEntry,
        thu: zDayEntry,
        fri: zDayEntry,
        sat: zDayEntry,
        sun: zDayEntry,
      })
      .strict(),
  })
  .strict()

export type BusinessHours = z.infer<typeof zBusinessHours>
export type BusinessHoursDayEntry = z.infer<typeof zDayEntry>
