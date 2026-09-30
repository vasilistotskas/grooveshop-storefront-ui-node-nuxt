/** A reserve-stock rejection that names the lines which could not be held. */
export type InsufficientStockError = Error & {
  code: 'insufficient_stock'
  failedItems: unknown
  detail?: unknown
}

/**
 * Turn a failed `POST /api/cart/reserve-stock` into the structured error
 * checkout shows per line, or `null` when it is any other failure.
 *
 * The server route normalises Django's 409 to `{ code, detail,
 * failedItems }` under `error.data.data`; only `code:
 * 'insufficient_stock'` with a `failedItems` key qualifies. The result
 * carries those fields on the `Error` itself, which is what
 * `useCheckoutSubmit` reads to fill its `stockError` alert.
 */
export function parseInsufficientStockError(error: unknown): InsufficientStockError | null {
  const errorData = error
    && typeof error === 'object'
    && 'data' in error
    && error.data
    && typeof error.data === 'object'
    && 'data' in error.data
    ? (error.data as { data: unknown }).data
    : null
  if (
    errorData
    && typeof errorData === 'object'
    && 'code' in errorData
    && (errorData as { code: unknown }).code === 'insufficient_stock'
    && 'failedItems' in errorData
  ) {
    const ed = errorData as {
      code: 'insufficient_stock'
      failedItems: unknown
      detail?: unknown
    }
    const structuredError = new Error('Insufficient stock for one or more items')
    return Object.assign(structuredError, {
      code: ed.code,
      failedItems: ed.failedItems,
      detail: ed.detail,
    })
  }
  return null
}
