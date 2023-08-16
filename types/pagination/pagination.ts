import { z } from 'zod'
import { LocationQueryValue } from 'vue-router'

export type Pagination<T> = {
	links: {
		next?: string | null
		prev?: string | null
	}
	count: number
	totalPages: number
	pageTotalResults: number
	pageSize: number
	page: number
	results: T[] | null
}

export const ZodPagination = <T>(resultSchema: z.Schema<T>): z.Schema<Pagination<T>> =>
	z.object({
		links: z.object({
			next: z.string().nullish(),
			prev: z.string().nullish()
		}),
		count: z.number(),
		totalPages: z.number(),
		pageTotalResults: z.number(),
		pageSize: z.number(),
		page: z.number(),
		results: z.array(resultSchema)
	})

export type PaginationQuery = {
	page?: number | LocationQueryValue[] | undefined
	offset?: number | LocationQueryValue[] | undefined
	limit?: number | LocationQueryValue[] | undefined
	pagination?: string | LocationQueryValue[] | undefined
}
