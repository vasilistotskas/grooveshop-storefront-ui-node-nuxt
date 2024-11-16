import type * as z from 'zod'

export type ProductOrderingField =
  | 'price'
  | 'createdAt'
  | 'discountValue'
  | 'finalPrice'
  | 'priceSavePercent'
  | 'reviewAverage'
  | 'approvedReviewAverage'
  | 'likesCount'

export type Product = z.infer<typeof ZodProduct>
