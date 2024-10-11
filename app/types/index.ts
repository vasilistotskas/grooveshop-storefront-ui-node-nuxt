import { object, string, number, boolean, union, literal, enum as zEnum } from 'zod'
import type { Avatar } from '#ui/types/avatar'

export * from './enum'
export * from './utility'
export * from './pagination'

const WeightUnits = zEnum(['g', 'lb', 'oz', 'kg', 'tonne'], {
  description: 'A type representing various weight units',
})

export const ZodWeight = object({
  unit: WeightUnits,
  value: number(),
})

export const ZodExpandQuery = object({
  expand: union([literal('true'), literal('false')]).nullish(),
  expandFields: string().nullish(),
})

export const ZodLanguageQuery = object({
  language: string().nullish(),
})

export const ZodTimeStampModel = object({
  createdAt: string().datetime({ offset: true }),
  updatedAt: string().datetime({ offset: true }),
})

export const ZodSeoModel = object({
  seoTitle: string().nullish(),
  seoDescription: string().nullish(),
  seoKeywords: string().nullish(),
})

export const ZodPublishableModel = object({
  publishedAt: string().datetime({ offset: true }).nullish(),
  isPublished: boolean(),
  isVisible: boolean(),
})

export const ZodSortableModel = object({
  sortOrder: number().int().nullish(),
})

export const ZodUUIDModel = object({
  uuid: string().uuid(),
})

export const ZodFloorChoicesEnum = zEnum([
  'BASEMENT',
  'GROUND_FLOOR',
  'FIRST_FLOOR',
  'SECOND_FLOOR',
  'THIRD_FLOOR',
  'FOURTH_FLOOR',
  'FIFTH_FLOOR',
  'SIXTH_FLOOR_PLUS',
])

export const ZodLocationChoicesEnum = zEnum(['HOME', 'OFFICE', 'OTHER'])

export interface LinksOption {
  to: string
  label: string
  labelClass?: string
  avatar?: Avatar
  icon?: string
}

export type FloorChoicesEnumType = typeof ZodFloorChoicesEnum._type
export type LocationChoicesEnumType = typeof ZodLocationChoicesEnum._type
