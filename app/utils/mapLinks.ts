/**
 * Links that open a place in the visitor's maps app, from what a
 * location band knows: its coordinates, or its address when it has none.
 *
 * Both are the providers' documented, key-less URL schemes:
 * - Google Maps URLs, the Search action
 *   (https://developers.google.com/maps/documentation/urls/get-started);
 * - Apple Maps unified URLs, the `/place` path
 *   (https://developer.apple.com/documentation/mapkit/unified-map-urls),
 *   whose `name` labels the place card.
 *
 * On a phone each opens its app when it is installed, the web map when not.
 */
export interface MapPlace {
  lat?: number
  lng?: number
  address?: string
  /** The label Apple Maps puts on the place card. */
  name?: string
}

const GOOGLE_MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1'
const APPLE_MAPS_PLACE = 'https://maps.apple.com/place'

export function mapLinks(place: MapPlace): { google: string, apple: string } | null {
  // `0` is a coordinate, so test the type rather than truthiness.
  const point = typeof place.lat === 'number' && typeof place.lng === 'number'
    ? `${place.lat},${place.lng}`
    : null
  if (!point && !place.address) return null

  const google = `${GOOGLE_MAPS_SEARCH}&query=${encodeURIComponent(point ?? place.address!)}`
  const apple = [
    point ? `coordinate=${point}` : `address=${encodeURIComponent(place.address!)}`,
    place.name ? `name=${encodeURIComponent(place.name)}` : null,
  ].filter(Boolean).join('&')

  return { google, apple: `${APPLE_MAPS_PLACE}?${apple}` }
}
