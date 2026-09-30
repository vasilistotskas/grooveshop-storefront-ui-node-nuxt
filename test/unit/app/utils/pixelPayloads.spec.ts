import { describe, it, expect } from 'vitest'
import { toMetaPayload, toTikTokPayload } from '~/utils/pixelPayloads'

/**
 * The vendors match events on exact snake_case keys and silently drop
 * anything else, so a renamed key is a lost conversion with no error
 * anywhere. Each row pins one camelCase field to the key the vendor
 * documents.
 */
describe('toMetaPayload', () => {
  it('sends nothing when the event carries no data', () => {
    expect(toMetaPayload(undefined)).toEqual({})
  })

  it.each([
    ['value', { value: 12.5 }, { value: 12.5 }],
    ['currency', { currency: 'EUR' }, { currency: 'EUR' }],
    ['contentName', { contentName: 'Shoe' }, { content_name: 'Shoe' }],
    ['contentCategory', { contentCategory: 'Shoes' }, { content_category: 'Shoes' }],
    ['contentType', { contentType: 'product' as const }, { content_type: 'product' }],
    ['contentIds', { contentIds: ['1', '2'] }, { content_ids: ['1', '2'] }],
    ['numItems', { numItems: 3 }, { num_items: 3 }],
    ['orderId', { orderId: 'ord-1' }, { order_id: 'ord-1' }],
    ['searchString', { searchString: 'boots' }, { search_string: 'boots' }],
    ['status', { status: 'done' }, { status: 'done' }],
    ['predictedLtv', { predictedLtv: 99 }, { predicted_ltv: 99 }],
  ])('maps %s to Meta\'s key', (_field, data, expected) => {
    expect(toMetaPayload(data)).toEqual(expected)
  })

  it('keeps a zero value and an empty id list instead of dropping them as falsy', () => {
    expect(toMetaPayload({ value: 0, numItems: 0, contentIds: [] }))
      .toEqual({ value: 0, num_items: 0, content_ids: [] })
  })

  it('maps each content line and omits the fields a line does not carry', () => {
    expect(toMetaPayload({
      contents: [
        { id: '7', quantity: 2, itemPrice: 19.9 },
        { id: '8' },
      ],
    })).toEqual({
      contents: [
        { id: '7', quantity: 2, item_price: 19.9 },
        { id: '8' },
      ],
    })
  })
})

describe('toTikTokPayload', () => {
  it('sends nothing when the event carries no data', () => {
    expect(toTikTokPayload(undefined)).toEqual({})
  })

  it.each([
    ['value', { value: 12.5 }, { value: 12.5 }],
    ['currency', { currency: 'EUR' }, { currency: 'EUR' }],
    ['contentId', { contentId: '7' }, { content_id: '7' }],
    ['contentType', { contentType: 'product' as const }, { content_type: 'product' }],
    ['contentName', { contentName: 'Shoe' }, { content_name: 'Shoe' }],
    ['description', { description: 'Blue shoe' }, { description: 'Blue shoe' }],
    ['query', { query: 'boots' }, { query: 'boots' }],
    ['orderId', { orderId: 'ord-1' }, { order_id: 'ord-1' }],
  ])('maps %s to TikTok\'s key', (_field, data, expected) => {
    expect(toTikTokPayload(data)).toEqual(expected)
  })

  it('keeps a zero value instead of dropping it as falsy', () => {
    expect(toTikTokPayload({ value: 0 })).toEqual({ value: 0 })
  })

  it('maps each content line, always with its id, omitting the optional fields it lacks', () => {
    expect(toTikTokPayload({
      contents: [
        { contentId: '7', contentType: 'product', contentName: 'Shoe', price: 19.9, quantity: 2 },
        { contentId: '8' },
      ],
    })).toEqual({
      contents: [
        { content_id: '7', content_type: 'product', content_name: 'Shoe', price: 19.9, quantity: 2 },
        { content_id: '8' },
      ],
    })
  })
})
