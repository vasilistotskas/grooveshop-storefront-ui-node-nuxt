/**
 * Whether the sign-up page may promise a welcome bonus, in every design:
 * loyalty on (the feature) and the new-customer bonus on (the store's
 * settings). Django awards it with the first order's points.
 */
export function useWelcomeBonus() {
  const loyaltyEnabled = useStoreFeature('loyalty')
  const loyaltySettings = useLoyaltySettings()

  return computed(() =>
    loyaltyEnabled.value && !!loyaltySettings.value?.newCustomerBonusEnabled,
  )
}
