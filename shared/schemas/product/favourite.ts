import * as z from 'zod'

export const ZodProductFavourite = z.object({
  id: z.number(),
  product: z.lazy(() => ZodProduct),
  user: z.number(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodProductFavouriteQuery = z
  .object({
    id: z.string().nullish(),
    userId: z.string().nullish(),
    productId: z.string().nullish(),
  })
  .merge(ZodLanguageQuery)
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
