import { z } from 'zod'

import { ZodProduct } from '~/types/product/product'
import { ZodUserAccount } from '~/types/user/account'
import { ZodOrderingQuery } from '~/types/ordering'
import { ZodPaginationQuery } from '~/types/pagination'
import { ZodExpandQuery } from '~/types/global/general'

export const ZodProductFavourite = z.object({
  id: z.number(),
  product: z.union([z.number(), z.lazy(() => ZodProduct)]),
  user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  uuid: z.string().uuid(),
})

export const ZodProductFavouriteQuery = z
  .object({
    id: z.string().nullish(),
    userId: z.string().nullish(),
    productId: z.string().nullish(),
  })
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodProductFavouriteCreateBody = z.object({
  user: z.string(),
  product: z.string(),
})

export const ZodProductFavouriteParams = z.object({
  id: z.string(),
})

export type ProductFavourite = z.infer<typeof ZodProductFavourite>
