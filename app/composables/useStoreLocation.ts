/**
 * The store's own location: `STORE_GEO_LAT` / `STORE_GEO_LNG`, decimal
 * degrees, as Django serves them (`values.storeGeoLat` / `storeGeoLng`,
 * validated in range when written).
 *
 * One reading for both places that show it: the LocalBusiness
 * structured data (`app.vue`) and the location map band. The band used
 * to carry its own coordinates, and the two drifted: a store's map
 * showed the owner's pin while the location it gave search engines was
 * about 750 m away.
 *
 * `undefined` until both are set. `0` is a coordinate, not a missing one.
 */
export function useStoreLocation() {
  const { values } = useStoreSettings()
  return computed(() => {
    const lat = values.value?.storeGeoLat
    const lng = values.value?.storeGeoLng
    return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined
  })
}
