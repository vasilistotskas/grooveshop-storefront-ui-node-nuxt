import type { LocationQueryValue } from 'vue-router'
import { z } from 'zod'

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
  resultSchema: z.Schema<T>,
): z.Schema<Pagination<T>> =>
  z.object({
    links: z.object({
      next: z.string().nullish(),
      prev: z.string().nullish(),
    }),
    count: z.number(),
    totalPages: z.number(),
    pageTotalResults: z.number(),
    pageSize: z.number(),
    page: z.number().optional(),
    results: z.array(resultSchema),
  })

export type PaginationQuery = {
  page?: number | LocationQueryValue[] | undefined
  offset?: number | LocationQueryValue[] | undefined
  limit?: number | LocationQueryValue[] | undefined
  cursor?: string | LocationQueryValue[] | undefined
  pagination?: 'true' | 'false' | LocationQueryValue[] | undefined
  pageSize?: number | LocationQueryValue[] | undefined
}

export const ZodPaginationQuery = z.object({
  pagination: z.union([z.literal('true'), z.literal('false')]).nullish(),
  page: z.union([z.number(), z.string()]).nullish(),
  offset: z.union([z.number(), z.string()]).nullish(),
  limit: z.union([z.number(), z.string()]).nullish(),
  cursor: z.union([z.number(), z.string()]).nullish(),
  pageSize: z.union([z.number(), z.string()]).nullish(),
  paginationType: z
    .union([
      z.literal('pageNumber'),
      z.literal('limitOffset'),
      z.literal('cursor'),
    ])
    .nullish(),
})
