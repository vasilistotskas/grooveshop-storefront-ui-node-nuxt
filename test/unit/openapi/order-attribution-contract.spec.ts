import { describe, expect, it } from 'vitest'

import { zCreateOrderBody, zOrderDetail } from '~~/shared/openapi/zod.gen'

/**
 * Contract tripwire for order attribution.
 *
 * The order proxy parses its body with `zCreateOrderBody`, a plain
 * `z.object` that silently strips unknown keys — before the schema knew
 * `attribution`, the storefront sent it and Django never saw it. And
 * Django answers `attribution: null` for an order with no attribution
 * row, which `parseDataAs` must accept or the order page 422s.
 */
describe('order attribution contract', () => {
  it('keeps the storefront attribution payload through body validation', () => {
    const attribution = {
      utmSource: 'ig',
      utmMedium: 'social',
      utmCampaign: 'autumn',
      clickIds: ['fbclid'],
      referrer: 'https://l.instagram.com',
      landingPath: '/products/42',
    }

    expect(zCreateOrderBody.shape.attribution.parse(attribution)).toEqual(attribution)
  })

  it('rejects a click id Django does not accept', () => {
    expect(() => zCreateOrderBody.shape.attribution.parse({ clickIds: ['utm_id'] })).toThrow()
  })

  it('accepts an order without attribution in the response', () => {
    const shape = zOrderDetail.shape.attribution

    expect(() => shape.parse(null)).not.toThrow()
    expect(shape.parse({ sourceType: 'social', source: 'instagram', medium: 'social', campaign: '' }))
      .toEqual({ sourceType: 'social', source: 'instagram', medium: 'social', campaign: '' })
  })
})
