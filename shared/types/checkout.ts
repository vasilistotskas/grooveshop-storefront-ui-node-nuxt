/** Per-line failure shape returned by the cart reservation API when
 *  one or more items can't be reserved (DRF 409 with code
 *  ``insufficient_stock``). The Nuxt server route normalises the
 *  upstream response and exposes the array under
 *  ``error.data.data.failedItems``. */
export interface FailedStockItem {
  productId: number
  productName: string
  available: number
  requested: number
}
