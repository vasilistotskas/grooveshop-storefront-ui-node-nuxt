import type * as z from 'zod'

export type ProductReview = z.infer<typeof ZodProductReview>
export type ProductReviewOrderingField =
  | 'id'
  | 'userId'
  | 'productId'
  | 'createdAt'
  | 'updatedAt'
