import { describe, it, expect } from 'vitest'
import { parseFbpFbcFromCookieHeader } from '~~/shared/utils/metaTracking'

/**
 * The Meta Pixel ids an order is sent to the Conversions API with, read
 * off the shopper's own cookies. Meta matches the browser event and the
 * server event on them, and requires them UNHASHED — so the value must
 * arrive exactly as the Pixel wrote it.
 */
describe('parseFbpFbcFromCookieHeader', () => {
  it('reads both ids among the other cookies', () => {
    const header = 'session=abc; _fbp=fb.1.1700000000000.123456789; theme=dark; _fbc=fb.1.1700000000000.IwAR0xyz'

    expect(parseFbpFbcFromCookieHeader(header)).toEqual({
      fbp: 'fb.1.1700000000000.123456789',
      fbc: 'fb.1.1700000000000.IwAR0xyz',
    })
  })

  it('reports no click id for a visitor who did not arrive from an ad', () => {
    // `_fbc` exists only after a `?fbclid=` landing.
    expect(parseFbpFbcFromCookieHeader('_fbp=fb.1.1.2')).toEqual({ fbp: 'fb.1.1.2', fbc: undefined })
  })

  it('decodes a percent-encoded value and tolerates spacing', () => {
    expect(parseFbpFbcFromCookieHeader(' _fbc = fb.1.1.IwAR%2Fabc ;_fbp=fb.1.1.2')).toEqual({
      fbp: 'fb.1.1.2',
      fbc: 'fb.1.1.IwAR/abc',
    })
  })

  it('treats an empty cookie as absent, not as an id', () => {
    expect(parseFbpFbcFromCookieHeader('_fbp=; _fbc=')).toEqual({ fbp: undefined, fbc: undefined })
  })

  it.each([[''], [null], [undefined]])('has nothing to read in %j', (header) => {
    expect(parseFbpFbcFromCookieHeader(header)).toEqual({})
  })

  it('does not take a look-alike cookie name for the Pixel\'s', () => {
    expect(parseFbpFbcFromCookieHeader('x_fbp=1; _fbpx=2')).toEqual({ fbp: undefined, fbc: undefined })
  })
})
