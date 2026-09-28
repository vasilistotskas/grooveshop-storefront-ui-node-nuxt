/**
 * CARTO basemap tile-layer builder — single source of truth for every
 * CARTO raster tile URL the storefront requests. Consumed by
 * `app/components/Checkout/SmartpointMap.client.vue` (checkout locker
 * map) and `app/components/PageSection/LocationCanvas.client.vue`
 * (store-location section).
 *
 * CARTO started requiring an API key for these tiles around
 * 2026-08-28: a keyless request to
 * `https://{s}.basemaps.cartocdn.com/{light_all,dark_all}/...` still
 * returns HTTP 200, but every tile carries an "API KEY REQUIRED"
 * watermark baked into the image. The fix (carto.com/basemaps/apikey,
 * github.com/CartoDB/basemap-styles) is a `?key=` query param appended
 * to the same URL template — nothing else about the tile scheme
 * changes.
 *
 * The key is public by design (CARTO's own docs): it always travels
 * in the tile URL, and CARTO restricts it server-side by Referer, not
 * by secrecy. One platform key covers every tenant — there is no
 * per-tenant CARTO account, unlike the BoxNow partner id or Stripe key.
 *
 * Import-free (no Nuxt/Vue APIs) so it stays unit-testable in a plain
 * Node environment — same rationale as `boxnow-widget.ts`.
 */

/** A Leaflet `L.TileLayer` constructor's options, exposed verbatim. */
export interface TileLayerSpec {
  url: string
  attribution: string
  maxZoom?: number
  subdomains?: string
}

export type CartoColorMode = 'light' | 'dark'

const CARTO_TILE_TEMPLATES: Record<CartoColorMode, string> = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

/** "© OpenStreetMap contributors © CARTO" — required by CARTO's terms
 *  regardless of the key; never drop this from a consuming map. */
export const CARTO_ATTRIBUTION
  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

export const CARTO_MAX_ZOOM = 19
export const CARTO_SUBDOMAINS = 'abcd'

/**
 * Build the keyed tile-layer spec for a colour mode. Returns `null`
 * when `key` is empty — the only guard against ever building the
 * keyless URL that CARTO now serves watermarked. An empty
 * `NUXT_PUBLIC_CARTO_BASEMAPS_KEY` must mean "no map", never a silent
 * fallback to a watermarked one; every caller must treat `null` as
 * "don't render the tile layer".
 */
export function buildCartoBasemap(mode: CartoColorMode, key: string): TileLayerSpec | null {
  if (!key) return null
  return {
    url: `${CARTO_TILE_TEMPLATES[mode]}?key=${encodeURIComponent(key)}`,
    attribution: CARTO_ATTRIBUTION,
    maxZoom: CARTO_MAX_ZOOM,
    subdomains: CARTO_SUBDOMAINS,
  }
}
