/**
 * Search helper for the ACS Smartpoint locker picker.
 *
 * ACS does not have an embeddable widget like BoxNow — we render the
 * picker ourselves using the local ``AcsStation`` cache (synced
 * nightly via the ``sync_acs_stations`` Celery task).  This composable
 * wraps the proxy endpoints with a debounced fetch + AbortController
 * so the picker stays responsive while the user types a postcode.
 *
 * Per project convention this composable uses ``useNuxtApp().$i18n``
 * (not ``useI18n``) so it can be called from non-component contexts
 * (Pinia stores, plugins) without crashing.
 */

import type { AcsStation } from '#shared/openapi/types.gen'

const DEFAULT_DEBOUNCE_MS = 300

export function useAcsStationSearch() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  const stations = ref<AcsStation[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  let pendingController: AbortController | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Cancel any in-flight or queued request.  Called from the
   * component's ``onUnmounted`` and before a fresh search.
   */
  function cancel() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (pendingController) {
      pendingController.abort()
      pendingController = null
    }
  }

  async function runFetch(postalCode: string, city?: string) {
    pendingController?.abort()
    const controller = new AbortController()
    pendingController = controller

    isLoading.value = true
    errorMessage.value = null
    try {
      const response = await $fetch<AcsStation[]>(
        '/api/shipping/acs/nearest',
        {
          method: 'GET',
          query: { postalCode, city: city || undefined },
          signal: controller.signal,
        },
      )
      // Guard against a stale response winning the race when the user
      // typed a fresh query while the previous one was still in flight.
      if (controller.signal.aborted) return
      stations.value = response ?? []
    }
    catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return
      errorMessage.value = t('shipping.acs.search_error')
      stations.value = []
    }
    finally {
      if (pendingController === controller) {
        pendingController = null
        isLoading.value = false
      }
    }
  }

  /**
   * Trigger a search for the given postcode (and optional city).
   * Empty postcodes clear the result list rather than firing a
   * doomed-to-fail request.
   */
  function search(
    postalCode: string,
    city?: string,
    { debounceMs = DEFAULT_DEBOUNCE_MS } = {},
  ) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    const trimmed = postalCode.trim()
    if (trimmed.length < 3) {
      stations.value = []
      isLoading.value = false
      return
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null
      runFetch(trimmed, city?.trim())
    }, debounceMs)
  }

  return { stations, isLoading, errorMessage, search, cancel }
}
