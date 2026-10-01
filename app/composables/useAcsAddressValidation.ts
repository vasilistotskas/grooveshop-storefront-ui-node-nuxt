/**
 * Composable wrapping the ACS address-validation proxy for checkout.
 *
 * The checkout step 0 watches street + streetNumber + zipcode + city
 * and calls ``validate(...)`` with a 600ms debounce.  Successful
 * resolutions surface as a "did you mean ..." chip under the form
 * fields; failures (or empty payloads) are silent — we don't want to
 * scare the shopper into thinking their address is wrong when it's
 * just rural / new / outside ACS's catalogue.
 *
 * Per project convention this composable uses ``useNuxtApp().$i18n``
 * (not ``useI18n``) so it can be invoked from non-component contexts.
 */

interface ResolvedAddress {
  geoId?: number | null
  resolvedStreet: string
  resolvedStreetNum: string
  resolvedZip: string
  resolvedArea: string
  resolvedLong?: number | null
  resolvedLat?: number | null
  resolvedStationId: string
  resolvedBranchId?: number | null
  resolvedProvidence: string
  addressId: string
}

const DEFAULT_DEBOUNCE_MS = 600

export function useAcsAddressValidation() {
  const resolved = ref<ResolvedAddress | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  let pending: AbortController | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Stop looking: the pending wait, the request in flight, and what the
   * last lookup found. The consumer calls this when the suggestion no
   * longer applies (the shopper switched it off or left ACS's country),
   * so nothing may stay "checking" and no earlier answer may stay on
   * offer — the aborted request leaves its state to its owner, which is
   * this call.
   */
  function cancel() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (pending) {
      pending.abort()
      pending = null
    }
    isLoading.value = false
    resolved.value = null
    errorMessage.value = null
  }

  async function runFetch(address: string) {
    pending?.abort()
    const controller = new AbortController()
    pending = controller
    isLoading.value = true
    errorMessage.value = null

    try {
      const response = await $api<ResolvedAddress>(
        '/api/shipping/acs/address-validation',
        {
          method: 'POST',
          body: { address },
          signal: controller.signal,
        },
      )
      if (controller.signal.aborted) return
      // Empty 200 responses (ACS could not geocode) collapse to null
      // so the consumer can render nothing without checking field-by-field.
      if (!response || !response.resolvedZip) {
        resolved.value = null
        return
      }
      resolved.value = response
    }
    catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return
      // Failures are intentionally silent (UX guidance above).
      resolved.value = null
      errorMessage.value
        = (error as { statusMessage?: string })?.statusMessage ?? null
    }
    finally {
      if (pending === controller) {
        pending = null
        isLoading.value = false
      }
    }
  }

  /**
   * Trigger validation for a free-text address string.  The shape is
   * "<street> <number> <zip> <city>" — ACS does its own parsing so we
   * just concatenate whatever the form has.
   */
  function validate(
    address: string,
    { debounceMs = DEFAULT_DEBOUNCE_MS } = {},
  ) {
    // A new address voids everything about the previous one: its wait,
    // its request in flight, and its answer — which could otherwise land
    // during this wait and be offered (and applied) for this address.
    cancel()
    const trimmed = address.trim()
    if (trimmed.length < 5) return
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      runFetch(trimmed)
    }, debounceMs)
  }

  return { resolved, isLoading, errorMessage, validate, cancel }
}
