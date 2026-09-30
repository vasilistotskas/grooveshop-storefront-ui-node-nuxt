import { describe, expect, it } from 'vitest'
import { parseBusinessHoursValue, resolveBusinessHoursState } from '~~/shared/utils/businessHours'

const HOURS = {
  timezone: 'Europe/Athens',
  schedule: {
    mon: { opens: '10:00', closes: '19:00' },
    tue: { opens: '10:00', closes: '19:00' },
    wed: { opens: '10:00', closes: '19:00' },
    thu: { opens: '10:00', closes: '19:00' },
    fri: { opens: '10:00', closes: '19:00' },
    sat: null,
    sun: null,
  },
}

describe('parseBusinessHoursValue', () => {
  it('parses a valid payload', () => {
    const parsed = parseBusinessHoursValue(JSON.stringify(HOURS))
    expect(parsed).not.toBeNull()
    expect(parsed?.timezone).toBe('Europe/Athens')
    expect(parsed?.schedule.sat).toBeNull()
  })

  it('treats empty/unset payloads as feature-off', () => {
    expect(parseBusinessHoursValue('')).toBeNull()
    expect(parseBusinessHoursValue(null)).toBeNull()
    expect(parseBusinessHoursValue(undefined)).toBeNull()
    expect(parseBusinessHoursValue('{}')).toBeNull()
  })

  it('rejects non-JSON and shape-invalid payloads without throwing', () => {
    expect(parseBusinessHoursValue('Mon-Fri 10-19')).toBeNull()
    expect(
      parseBusinessHoursValue(JSON.stringify({ timezone: 'Europe/Athens' })),
    ).toBeNull()
    const missingDay = {
      timezone: 'Europe/Athens',
      schedule: { ...HOURS.schedule, sun: undefined },
    }
    expect(parseBusinessHoursValue(JSON.stringify(missingDay))).toBeNull()
    const inverted = {
      timezone: 'Europe/Athens',
      schedule: {
        ...HOURS.schedule,
        mon: { opens: '19:00', closes: '10:00' },
      },
    }
    expect(parseBusinessHoursValue(JSON.stringify(inverted))).toBeNull()
  })
})

describe('resolveBusinessHoursState', () => {
  // 2026-08-31 is a Monday. Athens is UTC+3 in August (EEST).
  const monday = (utcHour: number, utcMinute = 0) =>
    new Date(Date.UTC(2026, 7, 31, utcHour, utcMinute))

  it('reports open inside the window, in store-local time', () => {
    // 12:00 UTC = 15:00 Athens
    const state = resolveBusinessHoursState(HOURS, monday(12))
    expect(state).toMatchObject({ day: 'mon', time: '15:00', isOpen: true })
  })

  it('is exact at the boundaries: opens inclusive, closes exclusive', () => {
    // 07:00 UTC = 10:00 Athens → just opened
    expect(resolveBusinessHoursState(HOURS, monday(7))?.isOpen).toBe(true)
    // 06:59 UTC = 09:59 Athens → not yet
    expect(resolveBusinessHoursState(HOURS, monday(6, 59))?.isOpen).toBe(false)
    // 15:59 UTC = 18:59 Athens → still open
    expect(resolveBusinessHoursState(HOURS, monday(15, 59))?.isOpen).toBe(true)
    // 16:00 UTC = 19:00 Athens → closed
    expect(resolveBusinessHoursState(HOURS, monday(16))?.isOpen).toBe(false)
  })

  it('reports closed on a null (closed) day', () => {
    // 2026-08-30 is a Sunday; 12:00 UTC = 15:00 Athens
    const sunday = new Date(Date.UTC(2026, 7, 30, 12))
    const state = resolveBusinessHoursState(HOURS, sunday)
    expect(state).toMatchObject({ day: 'sun', isOpen: false })
    expect(state?.todayHours).toBeNull()
  })

  it('crosses the store-local midnight correctly', () => {
    // Sunday 22:00 UTC = Monday 01:00 Athens → day is mon, closed
    const state = resolveBusinessHoursState(
      HOURS,
      new Date(Date.UTC(2026, 7, 30, 22)),
    )
    expect(state).toMatchObject({ day: 'mon', time: '01:00', isOpen: false })
  })

  it('follows the winter offset too', () => {
    // 2026-12-07 is a Monday; Athens is UTC+2 in winter (EET), so
    // 08:00 UTC is 10:00 local — just opened — and 07:59 is not yet.
    expect(resolveBusinessHoursState(HOURS, new Date(Date.UTC(2026, 11, 7, 8)))).toMatchObject({ day: 'mon', time: '10:00', isOpen: true })
    expect(resolveBusinessHoursState(HOURS, new Date(Date.UTC(2026, 11, 7, 7, 59)))?.isOpen).toBe(false)
  })

  it('returns null for an Intl-unknown timezone', () => {
    const bad = { ...HOURS, timezone: 'Mars/Olympus_Mons' }
    expect(resolveBusinessHoursState(bad, monday(12))).toBeNull()
  })
})
