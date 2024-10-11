import type { LocationQueryValue } from 'vue-router'
import type { Schema } from 'zod'
import { object, string, number, array, union, literal, optional } from 'zod'
import type { PaginationCursorStateEnum } from '~/types/enum'

export type Pagination<T> = {
  links: {
    next?: string | null
    prev?: string | null
  }
  count: number
  totalPages: number
  pageTotalResults: number
  pageSize: number
  page?: number
  results: T[] | null
} & {
  limit?: number
  offset?: number
  cursor?: string
}

export const ZodPagination = <T>(
  resultSchema: Schema<T>,
): Schema<Pagination<T>> =>
  object({
    links: object({
      next: string().nullish(),
      prev: string().nullish(),
    }),
    count: number(),
    totalPages: number(),
    pageTotalResults: number(),
    pageSize: number(),
    page: optional(number()),
    results: array(resultSchema),
  })

export type PaginationQuery = {
  page?: number | LocationQueryValue[] | undefined
  offset?: number | LocationQueryValue[] | undefined
  limit?: number | LocationQueryValue[] | undefined
  cursor?: string | LocationQueryValue[] | undefined
  pagination?: 'true' | 'false' | LocationQueryValue[] | undefined
  pageSize?: number | LocationQueryValue[] | undefined
}

export const ZodPaginationQuery = object({
  pagination: union([literal('true'), literal('false')]).nullish(),
  page: union([number(), string()]).nullish(),
  offset: union([number(), string()]).nullish(),
  limit: union([number(), string()]).nullish(),
  cursor: union([number(), string()]).nullish(),
  pageSize: union([number(), string()]).nullish(),
  paginationType: union([
    literal('pageNumber'),
    literal('limitOffset'),
    literal('cursor'),
  ]).nullish(),
})

export type PaginationCursorStateType = `${PaginationCursorStateEnum}-${string}`

export type CursorStates = {
  [key in PaginationCursorStateEnum | PaginationCursorStateType]?: string | null
}

export type PaginationType = 'pageNumber' | 'cursor' | 'limitOffset'
