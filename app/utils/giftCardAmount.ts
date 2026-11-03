/**
 * A gift-card purchase bound (`GIFT_CARD_MIN_AMOUNT` / `GIFT_CARD_MAX_AMOUNT`)
 * as the page states it. Django sends every public setting, its own value or
 * the one the platform declares, and validates the amount itself
 * (`GiftCardService.validate_purchase_amount`), so the page keeps no default
 * of its own. `null` when the bound is unreadable (the settings could not be
 * fetched) or not a positive amount, for the caller to leave that side to
 * Django.
 */
export function giftCardAmountBound(amount: number | undefined): number | null {
  return amount !== undefined && amount > 0 ? amount : null
}
