import { describe, it, expect } from 'vitest'
import { parseInsufficientStockError } from '~/utils/stockError'

const FAILED_ITEMS = [{ productId: 1, productName: 'Shirt', available: 0, requested: 2 }]

/** The ofetch error the reserve-stock proxy rejects with: Django's body at `data.data`. */
const fetchError = (data: unknown) => Object.assign(new Error('409'), { data: { data } })

describe('parseInsufficientStockError', () => {
  it('carries the code, the failed lines and the detail on the error', () => {
    const error = parseInsufficientStockError(fetchError({
      code: 'insufficient_stock',
      failedItems: FAILED_ITEMS,
      detail: 'Not enough stock.',
    }))

    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      message: 'Insufficient stock for one or more items',
      code: 'insufficient_stock',
      failedItems: FAILED_ITEMS,
      detail: 'Not enough stock.',
    })
  })

  it('keeps a missing detail undefined', () => {
    const error = parseInsufficientStockError(fetchError({ code: 'insufficient_stock', failedItems: [] }))

    expect(error).toMatchObject({ code: 'insufficient_stock', failedItems: [] })
    expect(error!.detail).toBeUndefined()
  })

  it.each([
    ['another code', fetchError({ code: 'cart_invalid', failedItems: FAILED_ITEMS })],
    ['no failedItems key', fetchError({ code: 'insufficient_stock', detail: 'x' })],
    ['an unnested body', Object.assign(new Error('409'), { data: { code: 'insufficient_stock', failedItems: [] } })],
    ['a null inner body', fetchError(null)],
    ['a network error', new TypeError('fetch failed')],
    ['a thrown string', 'boom'],
    ['null', null],
  ])('is null for %s', (_case, error) => {
    expect(parseInsufficientStockError(error)).toBeNull()
  })
})
