/**
 * The shopper's position, asked for once, on their action.
 *
 * `locate()` is the only call that may make the browser ask for
 * permission, so a caller runs it from a click, or on its own only when
 * `permission` already reads `granted`, where the browser asks nothing.
 * One coarse fix (no GPS: an area is all a pickup-point search needs),
 * never a watch. Every way it can fail ends in a status the caller
 * explains, and the position it had stays: `denied` (the shopper or the
 * browser said no), `unavailable` (no fix in time, or none at all).
 * `supported` is false on the server and in a browser with no
 * Geolocation API, where nothing should offer it.
 */
export type ShopperLocationStatus = 'idle' | 'locating' | 'located' | 'denied' | 'unavailable'

const LOCATION_TIMEOUT_MS = 10_000
const LOCATION_MAX_AGE_MS = 5 * 60_000

export function useShopperLocation() {
  const supported = useSupported(() => import.meta.client && Boolean(navigator.geolocation))
  const permission = usePermission('geolocation')
  const position = shallowRef<GeoPoint | null>(null)
  const status = ref<ShopperLocationStatus>('idle')
  // A newer request, or `cancel()`, makes an older answer stale.
  let attempt = 0

  function locate(): void {
    if (!supported.value) return
    const current = ++attempt
    status.value = 'locating'
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (current !== attempt) return
        position.value = { lat: coords.latitude, lng: coords.longitude }
        status.value = 'located'
      },
      (error) => {
        if (current !== attempt) return
        status.value = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'
      },
      { enableHighAccuracy: false, timeout: LOCATION_TIMEOUT_MS, maximumAge: LOCATION_MAX_AGE_MS },
    )
  }

  function cancel(): void {
    attempt += 1
    if (status.value === 'locating') status.value = position.value ? 'located' : 'idle'
  }

  return { supported, permission, position, status, locate, cancel }
}
