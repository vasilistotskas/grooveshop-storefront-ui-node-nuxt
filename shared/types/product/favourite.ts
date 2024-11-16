import type * as z from 'zod'

export type ProductFavourite = z.infer<typeof ZodProductFavourite>
export type ProductFavouriteOrderingField =
  | 'id'
  | 'productId'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
