/**
 * "Did you mean ..." under the checkout address grid, apart from its
 * drawing (`Checkout/AcsAddressSuggestion` and the tenants' own).
 *
 * Watches the four address fields of `formState` (street, streetNumber,
 * zipcode, city): once all four are populated it asks ACS's
 * `ACS_Address_Validation` through `useAcsAddressValidation` (debounced,
 * through our Nuxt proxy). When ACS returns a different-but-cleaner
 * spelling, `hasSuggestion` is true and `suggestionLine` says it, for the
 * shopper to apply.
 *
 * UX rules:
 *   - Failures are silent. ACS being down or unconfigured must never
 *     scare the shopper into thinking their address is wrong.
 *   - The suggestion is only offered when something *meaningful* differs
 *     from what they typed (street, number, or zip). An identical match
 *     would be noise.
 *
 * `enabled` is the master switch: while it is not true nothing is asked
 * (outside Greece, or a store without ACS, whose proxy answers 503).
 */
export function useAcsAddressSuggestion(options: {
  formState: Ref<Record<string, unknown>>
  enabled: () => boolean | undefined
}) {
  const { formState } = options
  const { resolved, isLoading, validate, cancel } = useAcsAddressValidation()

  // The four fields the shopper typed, as one free-text string for ACS's
  // parser. Empty fields collapse; the composable short-circuits on
  // strings shorter than 5 chars so no API call fires for half-filled
  // forms.
  const currentAddress = computed(() => {
    const parts = [
      formState.value.street,
      formState.value.streetNumber,
      formState.value.zipcode,
      formState.value.city,
    ]
    return parts.filter(Boolean).join(' ').trim()
  })

  const isAllFilled = computed(
    () =>
      Boolean(formState.value.street)
      && Boolean(formState.value.streetNumber)
      && Boolean(formState.value.zipcode)
      && Boolean(formState.value.city),
  )

  watch(
    [currentAddress, options.enabled, isAllFilled],
    ([address, enabled, allFilled]) => {
      if (!enabled || !allFilled) {
        cancel()
        return
      }
      validate(address)
    },
    { immediate: true },
  )

  onUnmounted(() => cancel())

  // "Different enough to suggest": nothing is offered when the resolved
  // values match what the shopper already typed. Compared stripped and
  // uppercased so a Greek/Latin punctuation difference does not look like
  // a real change.
  const normalize = (value: unknown) =>
    String(value ?? '')
      .trim()
      .toUpperCase()

  const hasSuggestion = computed(() => {
    const r = resolved.value
    if (!r) return false
    const streetDiffers
      = normalize(r.resolvedStreet)
        && normalize(r.resolvedStreet) !== normalize(formState.value.street)
    const zipDiffers
      = normalize(r.resolvedZip)
        && normalize(r.resolvedZip) !== normalize(formState.value.zipcode)
    const numberDiffers
      = normalize(r.resolvedStreetNum)
        && normalize(r.resolvedStreetNum)
        !== normalize(formState.value.streetNumber)
    return Boolean(streetDiffers || zipDiffers || numberDiffers)
  })

  const suggestionLine = computed(() => {
    const r = resolved.value
    if (!r) return ''
    const street = [r.resolvedStreet, r.resolvedStreetNum]
      .filter(Boolean)
      .join(' ')
    const cityLine = [r.resolvedZip, r.resolvedArea].filter(Boolean).join(' ')
    return [street, cityLine].filter(Boolean).join(', ')
  })

  function applySuggestion() {
    const r = resolved.value
    if (!r) return

    // Visible form fields the shopper sees populate.
    if (r.resolvedStreet) formState.value.street = r.resolvedStreet
    if (r.resolvedStreetNum) {
      formState.value.streetNumber = r.resolvedStreetNum
    }
    if (r.resolvedZip) formState.value.zipcode = r.resolvedZip
    // ACS's `resolvedArea` is the area/neighborhood label ("Περιοχή"), not
    // the city ("Πόλη"). The checkout no longer collects a separate area
    // field, so `resolvedArea` is intentionally not applied: `city` is
    // left to whatever the shopper entered.

    // Stash the ACS routing metadata on form state. It is not surfaced in
    // any visible input: Greek περιφέρειες (the modern region selector) do
    // not map 1:1 to ACS's nomos-based `resolvedProvidence`, and lat/long
    // + geoId + stationId + branchId are not address fields, they are
    // routing hints. Forwarded to the backend on order create so
    // `ACS_Create_Voucher` can consume them directly without re-running
    // `ACS_Address_Validation` server-side.
    formState.value.acsResolvedAddress = {
      geoId: r.geoId ?? null,
      lat: r.resolvedLat ?? null,
      lng: r.resolvedLong ?? null,
      stationId: r.resolvedStationId || null,
      branchId: r.resolvedBranchId ?? null,
      providence: r.resolvedProvidence || null,
      addressId: r.addressId || null,
    }
  }

  return { isLoading, hasSuggestion, suggestionLine, isAllFilled, applySuggestion }
}
