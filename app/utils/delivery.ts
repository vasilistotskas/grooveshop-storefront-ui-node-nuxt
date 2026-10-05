/**
 * The shopper-facing side of a shipping rate's delivery estimate and the
 * store's dispatch cutoff. Both are plain data from Django; the business
 * calendar (weekends, Greek holidays) lives there, so nothing here turns
 * them into a date.
 */

/**
 * The `DISPATCH_CUTOFF` public setting, `HH:MM` Athens time, as the text
 * to show — or null when the store set none (empty) or wrote something
 * that is not a clock time, so a typo never reaches a shopper.
 */
export function parseDispatchCutoff(value: string | undefined): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value?.trim() ?? '')
  return match ? `${match[1]}:${match[2]}` : null
}

/**
 * A rate's estimate as the numbers the copy is built from, or null when
 * the rate advertises none. Django sends both fields or neither; one
 * without the other is treated as no estimate rather than guessed at.
 */
export function deliveryEstimate(
  option: { deliveryDaysMin: number | null, deliveryDaysMax: number | null },
): { min: number, max: number } | null {
  const { deliveryDaysMin: min, deliveryDaysMax: max } = option
  return min === null || max === null ? null : { min, max }
}
