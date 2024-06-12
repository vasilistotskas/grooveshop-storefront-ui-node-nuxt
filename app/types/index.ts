import { z } from 'zod'
import type { NotAuthenticatedResponse } from '~/types/all-auth'

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

export enum FloorChoicesEnum {
  BASEMENT = 0,
  GROUND_FLOOR = 1,
  FIRST_FLOOR = 2,
  SECOND_FLOOR = 3,
  THIRD_FLOOR = 4,
  FOURTH_FLOOR = 5,
  FIFTH_FLOOR = 6,
  SIXTH_FLOOR_PLUS = 7,
}

export enum LocationChoicesEnum {
  HOME = 0,
  OFFICE = 1,
  OTHER = 2,
}

export enum PaginationTypeEnum {
  PAGE_NUMBER = 'pageNumber',
  CURSOR = 'cursor',
  LIMIT_OFFSET = 'limitOffset',
}

export enum PaginationCursorStateEnum {
  BLOG_POSTS = 'blogPostsCursor',
  BLOG_POST_COMMENTS = 'blogPostCommentsCursor',
}

export type PaginationCursorStateType = `${PaginationCursorStateEnum}-${string}`

export type CursorStates = {
  [key in PaginationCursorStateEnum | PaginationCursorStateType]?: string | null
}

export type PaginationType = 'pageNumber' | 'cursor' | 'limitOffset'
export type ImageLoading = 'lazy' | 'eager' | undefined
export type FloorChoicesEnumType = z.infer<typeof ZodFloorChoicesEnum>
export type LocationChoicesEnumType = z.infer<typeof ZodLocationChoicesEnum>

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

export type ErrorWithMessage = {
  message: string
}

export type ErrorWithDetail = {
  data: {
    data: {
      detail: string
    }
  }
}

export interface ErrorResponse {
  data: {
    data: NotAuthenticatedResponse
  }
}
