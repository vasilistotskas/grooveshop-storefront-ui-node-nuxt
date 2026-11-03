/**
 * How many days a gift card stays valid, from the store's
 * `GIFT_CARD_VALIDITY_DAYS`. Django sets `expires_at` to exactly that many
 * days after issue (`giftcard/services.py`), so the claim stays in days:
 * 1825 days is not five calendar years when a 29 February falls inside.
 * `null` when the setting is unreadable or not a positive number of days,
 * for the caller to say nothing about validity.
 */
export function giftCardValidityDays(days: number | undefined): number | null {
  return days !== undefined && days > 0 ? days : null
}
