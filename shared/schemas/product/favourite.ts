import * as z from 'zod'

export const ZodProductFavourite = z.object({
  id: z.number(),
  product: z.union([z.number(), z.lazy(() => ZodProduct)]),
  user: z.union([z.number(), z.lazy(() => ZodUserAccount)]),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodProductFavouriteQuery = z
  .object({
    id: z.string().nullish(),
    userId: z.string().nullish(),
    productId: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
  .merge(ZodExpandQuery)
  .merge(ZodOrderingQuery)
  .merge(ZodPaginationQuery)

export const ZodProductFavouriteCreateBody = z.object({
  user: z.string(),
  product: z.string(),
})

export const ZodProductFavouritesByProductsBody = z.object({
  productIds: z.array(z.number()),
})

export const ZodProductFavouriteParams = z.object({
  id: z.string(),
})
