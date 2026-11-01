import type { MapOptions } from 'maplibre-gl'
import { layers, namedFlavor } from '@protomaps/basemaps'

/**
 * The basemap every storefront map draws on: the Protomaps basemap, from
 * the platform's own tile host, styled in code.
 *
 * The tiles are a regional extract of the Protomaps daily build, served
 * as z/x/y vector tiles by `pmtiles serve` behind the platform maps host
 * (`runtimeConfig.public.mapsTileJsonUrl`, the archive's TileJSON;
 * `grooveshop-infrastructure/docs/maps.md`). The glyphs come from the
 * storefront itself (`public/maps/fonts`: the three Noto Sans fontstacks
 * the style uses, every range, from `protomaps/basemaps-assets` at
 * 028c18f, under the `OFL.txt` beside them), so a map only ever talks to
 * the store's own host and the maps host: no key, no per-domain
 * allowlist, and no visitor IP sent to a third party.
 *
 * The basemap is a neutral light/dark flavour on purpose. A store's
 * identity is the markers, clusters and buttons drawn over it with the
 * theme's CSS tokens; MapLibre style colours must be sRGB strings, and
 * the tokens are `color-mix()` expressions.
 *
 * Pure (no Nuxt/Vue APIs) so it stays unit-testable in Node.
 */

/** MapLibre's style document; its package exports the type only inside `MapOptions`. */
export type BasemapStyle = Exclude<MapOptions['style'], string | undefined>
export type BasemapLayer = BasemapStyle['layers'][number]

export type BasemapMode = 'light' | 'dark'

/** The id of the vector source every basemap layer reads. */
export const BASEMAP_SOURCE = 'protomaps'

/**
 * Required by the data's licence (ODbL, Produced Work), visible on load:
 * every map sets `attributionControl: { compact: false }`.
 */
export const BASEMAP_ATTRIBUTION
  = '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/**
 * Layers that draw sprite icons. The style ships no sprite, so these are
 * dropped (`pois`, `roads_shields`, `roads_oneway`) or lose their icon
 * (`places_locality`'s town dots): a missing image is a `styleimagemissing`
 * event per feature, and points of interest compete with the markers a
 * map exists to show.
 */
const DROPPED_LAYERS = new Set(['pois', 'roads_shields', 'roads_oneway'])
const ICON_LAYERS = new Set(['places_locality'])

function withoutSprites(layer: BasemapLayer): BasemapLayer | null {
  if (DROPPED_LAYERS.has(layer.id)) return null
  if (!ICON_LAYERS.has(layer.id) || layer.type !== 'symbol' || !layer.layout) return layer
  const { 'icon-image': _iconImage, 'icon-size': _iconSize, 'icon-padding': _iconPadding, ...layout } = layer.layout
  return { ...layer, layout }
}

export interface BasemapStyleOptions {
  /** The archive's TileJSON on the maps host. */
  tileJsonUrl: string
  /** Absolute glyph URL template with `{fontstack}` and `{range}`. */
  glyphsUrl: string
  mode: BasemapMode
  /** The page's locale: the language the place names are drawn in. */
  lang: string
}

export function buildBasemapStyle(options: BasemapStyleOptions): BasemapStyle {
  const basemapLayers: BasemapLayer[] = layers(BASEMAP_SOURCE, namedFlavor(options.mode), { lang: options.lang })
  return {
    version: 8,
    glyphs: options.glyphsUrl,
    sources: {
      [BASEMAP_SOURCE]: {
        type: 'vector',
        url: options.tileJsonUrl,
        attribution: BASEMAP_ATTRIBUTION,
      },
    },
    layers: basemapLayers
      .map(withoutSprites)
      .filter((layer): layer is BasemapLayer => layer !== null),
  }
}

/** A `[west, south, east, north]` box. */
export type LngLatBox = [number, number, number, number]

/** The box around every point, or `null` for none. */
export function boundsOf(points: ReadonlyArray<{ lat: number, lng: number }>): LngLatBox | null {
  const first = points[0]
  if (!first) return null
  const box: LngLatBox = [first.lng, first.lat, first.lng, first.lat]
  for (const { lat, lng } of points) {
    box[0] = Math.min(box[0], lng)
    box[1] = Math.min(box[1], lat)
    box[2] = Math.max(box[2], lng)
    box[3] = Math.max(box[3], lat)
  }
  return box
}
