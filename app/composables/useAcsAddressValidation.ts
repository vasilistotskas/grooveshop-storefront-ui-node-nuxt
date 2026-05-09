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

  function cancel() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (pending) {
      pending.abort()
      pending = null
    }
  }

  async function runFetch(address: string) {
    pending?.abort()
    const controller = new AbortController()
    pending = controller
    isLoading.value = true
    errorMessage.value = null

    try {
      const response = await $fetch<ResolvedAddress>(
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
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    const trimmed = address.trim()
    if (trimmed.length < 5) {
      resolved.value = null
      isLoading.value = false
      return
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      runFetch(trimmed)
    }, debounceMs)
  }

  return { resolved, isLoading, errorMessage, validate, cancel }
}
