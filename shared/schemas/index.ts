import * as z from 'zod'

export const ZodWeightUnits = z.enum(['g', 'lb', 'oz', 'kg', 'tonne'], {
  description: 'A type representing various weight units',
})

export const ZodWeight = z.object({
  unit: ZodWeightUnits,
  value: z.number(),
})

export const ZodExpandQuery = z.object({
  expand: z.union([z.literal('true'), z.literal('false')]).nullish(),
  expandFields: z.string().nullish(),
})

export const ZodLanguageQuery = z.object({
  language: z.string().nullish(),
})

export const ZodTimeStampModel = z.object({
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export const ZodSeoModel = z.object({
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  seoKeywords: z.string().nullish(),
})

export const ZodPublishableModel = z.object({
  publishedAt: z.string().datetime({ offset: true }).nullish(),
  isPublished: z.boolean(),
  isVisible: z.boolean(),
})

export const ZodSortableModel = z.object({
  sortOrder: z.number().int().nullish(),
})

export const ZodUUIDModel = z.object({
  uuid: z.string().uuid(),
})
