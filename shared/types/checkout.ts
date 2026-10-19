/** Per-line failure shape returned by the cart reservation API when
 *  one or more items can't be reserved (DRF 409 with code
 *  ``insufficient_stock``). The Nuxt server route forwards Django's
 *  body, so the array is ``error.data.failedItems``. */
export interface FailedStockItem {
  productId: number
  productName: string
  available: number
  requested: number
}
