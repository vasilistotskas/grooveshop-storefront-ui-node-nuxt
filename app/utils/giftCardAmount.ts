/**
 * A gift-card purchase bound (`GIFT_CARD_MIN_AMOUNT` / `GIFT_CARD_MAX_AMOUNT`)
 * as a number. Django sends every public setting, its own value or the one
 * the platform declares, and validates the amount itself
 * (`GiftCardService.validate_purchase_amount`), so the page keeps no default
 * of its own. `null` when the bound is unreadable (the settings could not be
 * fetched), for the caller to leave that side to Django.
 */
export function giftCardAmountBound(amount: string): number | null {
  const value = Number(amount)
  if (!amount.trim() || !Number.isFinite(value) || value <= 0) return null
  return value
}
