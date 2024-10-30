import * as z from 'zod'
import type { Avatar } from '#ui/types/avatar'

export * from './enum'
export * from './utility'
export * from './pagination'

const WeightUnits = z.enum(['g', 'lb', 'oz', 'kg', 'tonne'], {
  description: 'A type representing various weight units',
})

export const ZodWeight = z.object({
  unit: WeightUnits,
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

export const ZodFloorChoicesEnum = z.enum([
  'BASEMENT',
  'GROUND_FLOOR',
  'FIRST_FLOOR',
  'SECOND_FLOOR',
  'THIRD_FLOOR',
  'FOURTH_FLOOR',
  'FIFTH_FLOOR',
  'SIXTH_FLOOR_PLUS',
])

export const ZodLocationChoicesEnum = z.enum(['HOME', 'OFFICE', 'OTHER'])

export interface LinksOption {
  to: string
  label: string
  labelClass?: string
  avatar?: Avatar
  icon?: string
}

export type FloorChoicesEnumType = z.infer<typeof ZodFloorChoicesEnum>
export type LocationChoicesEnumType = z.infer<typeof ZodLocationChoicesEnum>
