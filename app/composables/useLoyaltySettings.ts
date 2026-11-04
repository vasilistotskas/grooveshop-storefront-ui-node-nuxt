/**
 * The loyalty programme's figures (redemption ratio, points factor, tier
 * multiplier, expiry, welcome bonus, XP per level), typed, from the
 * store's one public settings payload (`useStoreSettings`): no request
 * and no route of its own.
 *
 * `null` means the figures cannot be known: the settings lookup failed.
 * Nothing is guessed in its place; each reader renders nothing for the
 * figure it needs. There is no pending state: the payload
 * is fetched with the page on the server (`useStoreSettings`' fetch
 * registers `onServerPrefetch`) and arrives in the page payload, so a
 * render that reaches a loyalty component already has it.
 *
 * Whether the programme is on is `useStoreFeature('loyalty')`, never a
 * field of this.
 */
export function useLoyaltySettings(): ComputedRef<LoyaltySettings | null> {
  const { values } = useStoreSettings()
  return computed<LoyaltySettings | null>(() => values.value && {
    redemptionRatioEur: values.value.loyaltyRedemptionRatioEur,
    pointsFactor: values.value.loyaltyPointsFactor,
    tierMultiplierEnabled: values.value.loyaltyTierMultiplierEnabled,
    pointsExpirationDays: values.value.loyaltyPointsExpirationDays,
    newCustomerBonusEnabled: values.value.loyaltyNewCustomerBonusEnabled,
    newCustomerBonusPoints: values.value.loyaltyNewCustomerBonusPoints,
    xpPerLevel: values.value.loyaltyXpPerLevel,
  })
}
