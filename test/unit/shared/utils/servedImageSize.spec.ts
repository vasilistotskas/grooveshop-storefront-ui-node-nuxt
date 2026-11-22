import { describe, expect, it } from 'vitest'
import { servedCoverSize } from '~~/shared/utils/servedImageSize'

/**
 * `servedCoverSize` repeats grooveshop-media-stream's `boxWithinSource` for
 * `cover`: the og:image and Article ImageObject sizes the storefront states
 * must be the ones the service serves.
 */
describe('servedCoverSize', () => {
  it('serves the box itself when the source covers it', () => {
    expect(servedCoverSize({ width: 2400, height: 1600 }, { width: 1200, height: 630 }))
      .toEqual({ width: 1200, height: 630 })
  })

  it('rounds as the media service does, a .5 case down', () => {
    // 675 * (440 / 1200) is 247.49999999999997 in a double.
    expect(servedCoverSize({ width: 440, height: 300 }, { width: 1200, height: 675 }))
      .toEqual({ width: 440, height: 247 })
  })

  it('keeps the box\'s shape inside a narrow source', () => {
    // A 1080 wide cover, the blog's older uploads, at the og box.
    expect(servedCoverSize({ width: 1080, height: 720 }, { width: 1200, height: 630 }))
      .toEqual({ width: 1080, height: 567 })
  })

  it('takes the height as the limit when the source is too short', () => {
    expect(servedCoverSize({ width: 1600, height: 500 }, { width: 1200, height: 630 }))
      .toEqual({ width: 952, height: 500 })
  })

  it('serves a square box from a short source at the source\'s height', () => {
    expect(servedCoverSize({ width: 1080, height: 567 }, { width: 1200, height: 1200 }))
      .toEqual({ width: 567, height: 567 })
  })

  it.each([
    { width: null, height: null },
    { width: 800, height: null },
    { width: undefined, height: undefined },
  ])('states no size when the source size is unknown (%o)', (source) => {
    expect(servedCoverSize(source, { width: 1200, height: 630 })).toBeUndefined()
  })
})
