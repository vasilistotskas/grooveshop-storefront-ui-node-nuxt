export type ValidityUnit = 'year' | 'month' | 'day'

/**
 * How long a gift card stays valid, in the largest unit that divides the
 * store's `GIFT_CARD_VALIDITY_DAYS` evenly (365 days a year, 30 a month):
 * 1825 -> 5 years, 90 -> 3 months, 45 -> 45 days. `null` when the setting is
 * unset or not a positive whole number of days, for the caller to say
 * nothing about validity.
 */
export function giftCardValidity(days: string): { count: number, unit: ValidityUnit } | null {
  const value = Number(days)
  if (!days.trim() || !Number.isInteger(value) || value <= 0) return null
  if (value % 365 === 0) return { count: value / 365, unit: 'year' }
  if (value % 30 === 0) return { count: value / 30, unit: 'month' }
  return { count: value, unit: 'day' }
}
