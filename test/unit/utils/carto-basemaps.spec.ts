/**
 * Unit tests for the CARTO basemap tile-layer builder.
 *
 * Pure-function tests — no Nuxt environment required. All exports are
 * imported explicitly since the unit project does not have Nuxt
 * auto-imports.
 */

import { describe, it, expect } from 'vitest'
import {
  buildCartoBasemap,
  CARTO_ATTRIBUTION,
  CARTO_MAX_ZOOM,
  CARTO_SUBDOMAINS,
} from '~~/shared/utils/carto-basemaps'

describe('buildCartoBasemap', () => {
  it('returns null for an empty key (no keyless fallback)', () => {
    expect(buildCartoBasemap('light', '')).toBeNull()
    expect(buildCartoBasemap('dark', '')).toBeNull()
  })

  it('builds a keyed light_all URL', () => {
    const tile = buildCartoBasemap('light', 'abc123')
    expect(tile).not.toBeNull()
    expect(tile!.url).toBe(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=abc123',
    )
    expect(tile!.attribution).toBe(CARTO_ATTRIBUTION)
    expect(tile!.maxZoom).toBe(CARTO_MAX_ZOOM)
    expect(tile!.subdomains).toBe(CARTO_SUBDOMAINS)
  })

  it('builds a keyed dark_all URL', () => {
    const tile = buildCartoBasemap('dark', 'abc123')
    expect(tile).not.toBeNull()
    expect(tile!.url).toBe(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=abc123',
    )
  })

  it('keeps the OpenStreetMap + CARTO attribution visible', () => {
    const tile = buildCartoBasemap('light', 'abc123')
    expect(tile!.attribution).toContain('OpenStreetMap')
    expect(tile!.attribution).toContain('CARTO')
  })

  it('URL-encodes the key', () => {
    const tile = buildCartoBasemap('light', 'a b/c')
    expect(tile!.url).toContain(`key=${encodeURIComponent('a b/c')}`)
  })
})
