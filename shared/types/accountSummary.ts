/**
 * Response of the account-summary BFF route
 * (``server/api/user/account/summary.get.ts``): the signed-in shopper's
 * figures the account band shows.
 *
 * A part is ``null`` when Django has nothing to show for it — the store
 * has the feature switched off (the loyalty, gift-card and B2B
 * endpoints each answer 404 then), or, for ``businessStatus``, the
 * shopper has no business profile.
 */
export interface AccountSummary {
  /** Orders the shopper has placed, all statuses. */
  ordersCount: number
  loyalty: {
    pointsBalance: number
    tier: LoyaltyTier | null
  } | null
  /** Balance left on the shopper's active, unexpired gift cards. */
  giftCardBalance: number | null
  businessStatus: BusinessProfileStatusEnum | null
}
