/**
 * The store's own location: `STORE_GEO_LAT` / `STORE_GEO_LNG`, decimal
 * degrees.
 *
 * One reading for both places that show it: the LocalBusiness
 * structured data (`app.vue`) and the location map band. The band used
 * to carry its own coordinates, and the two drifted: a store's map
 * showed the owner's pin while the location it gave search engines was
 * about 750 m away.
 *
 * `undefined` until both settings are decimal degrees in range
 * (`parseDegrees`): a malformed or impossible value is no location rather
 * than a wrong one. `0` is a coordinate, not a missing one.
 */
export function useStoreLocation() {
  const latitude = useSettingValue('STORE_GEO_LAT')
  const longitude = useSettingValue('STORE_GEO_LNG')
  return computed(() => {
    const lat = parseDegrees(latitude.value, LATITUDE_LIMIT)
    const lng = parseDegrees(longitude.value, LONGITUDE_LIMIT)
    return lat !== undefined && lng !== undefined ? { lat, lng } : undefined
  })
}
