import * as z from 'zod'

export const ZodWeightUnits = z.enum(['g', 'lb', 'oz', 'kg', 'tonne'], {
  description: 'A type representing various weight units',
})

export const ZodWeight = z.object({
  unit: ZodWeightUnits,
  value: z.number(),
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

export const ZodFloorEnum = z.enum([
  'BASEMENT',
  'GROUND_FLOOR',
  'FIRST_FLOOR',
  'SECOND_FLOOR',
  'THIRD_FLOOR',
  'FOURTH_FLOOR',
  'FIFTH_FLOOR_PLUS',
])

export const ZodLocationTypeEnum = z.enum([
  'HOME',
  'OFFICE',
  'OTHER',
])
