import type { BoxNowLocker } from '~~/shared/openapi/types.gen'

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

/**
 * The BOX NOW locker a checkout picked (`formState.boxnowLocker`), from
 * Django's locker catalogue: what the selected-locker card, the review and
 * the summary show. The order carries only its `externalId`
 * (`boxnowLockerId`).
 */
export type BoxNowPickedLocker = Pick<BoxNowLocker, 'externalId' | 'name' | 'addressLine1' | 'addressLine2' | 'postalCode' | 'countryCode' | 'note'>
