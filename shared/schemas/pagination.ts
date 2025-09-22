import * as z from 'zod'

export const ZodPagination = <T>(
  resultSchema: z.Schema<T>,
): z.Schema<Pagination<T>> =>
  z.object({
    links: z.object({
      next: z.string().nullish(),
      previous: z.string().nullish(),
    }),
    count: z.number(),
    totalPages: z.number(),
    pageTotalResults: z.number(),
    pageSize: z.number(),
    page: z.number().optional(),
    results: z.array(resultSchema),
  })

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
