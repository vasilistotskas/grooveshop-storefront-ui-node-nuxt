import { describe, expect, it } from 'vitest'
import { BASEMAP_SOURCE, boundsOf, buildBasemapStyle } from '~/utils/basemap'

const OPTIONS = {
  tileJsonUrl: 'https://maps.grooveshop.space/basemap.json',
  glyphsUrl: 'https://store.test/maps/fonts/{fontstack}/{range}.pbf',
  mode: 'light' as const,
  lang: 'el',
}

/** Every string anywhere in a value, for asserting on style expressions. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('buildBasemapStyle', () => {
  it('reads one vector source from the maps host, credited to OpenStreetMap', () => {
    const style = buildBasemapStyle(OPTIONS)

    expect(Object.keys(style.sources)).toEqual([BASEMAP_SOURCE])
    expect(style.sources[BASEMAP_SOURCE]).toMatchObject({ type: 'vector', url: OPTIONS.tileJsonUrl })
    // ODbL: the credit links the copyright page, and is visible on load.
    expect(JSON.stringify(style.sources[BASEMAP_SOURCE])).toContain('https://www.openstreetmap.org/copyright')
    expect(style.glyphs).toBe(OPTIONS.glyphsUrl)
  })

  it('draws place names in the page\'s language', () => {
    expect(strings(buildBasemapStyle(OPTIONS).layers)).toContain('name:el')
    expect(strings(buildBasemapStyle({ ...OPTIONS, lang: 'en' }).layers)).toContain('name:en')
  })

  it('asks for no sprite: no icon layer, no icon image', () => {
    const style = buildBasemapStyle(OPTIONS)

    expect(style.sprite).toBeUndefined()
    const ids = style.layers.map(layer => layer.id)
    expect(ids).not.toContain('pois')
    expect(ids).not.toContain('roads_shields')
    expect(ids).toContain('places_locality')
    expect(style.layers.filter(layer => layer.layout && 'icon-image' in layer.layout)).toEqual([])
  })

  it('swaps the flavour with the colour mode', () => {
    const background = (mode: 'light' | 'dark') =>
      buildBasemapStyle({ ...OPTIONS, mode }).layers.find(layer => layer.id === 'background')
    expect(background('light')).not.toEqual(background('dark'))
  })
})

describe('boundsOf', () => {
  it('boxes every point as [west, south, east, north]', () => {
    expect(boundsOf([{ lat: 37.9, lng: 23.7 }, { lat: 40.6, lng: 22.9 }, { lat: 35.3, lng: 25.1 }]))
      .toEqual([22.9, 35.3, 25.1, 40.6])
  })

  it('has no box for no points', () => {
    expect(boundsOf([])).toBeNull()
  })
})
