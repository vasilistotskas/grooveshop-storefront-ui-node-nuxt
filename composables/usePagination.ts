import type { Pagination } from '~/types/pagination'

export const usePagination = <T>(results: Pagination<T> | null) => {
	if (!results)
		return {
			count: 0,
			totalPages: 0,
			pageTotalResults: 0,
			pageSize: 0,
			page: 0,
			links: {
				next: null,
				prev: null
			},
			offset: 0,
			limit: 0
		}
	const count = results.count

	const totalPages = results.totalPages
	const pageTotalResults = results.pageTotalResults

	const pageSize = results.pageSize

	const page = results.page

	const links = results.links
	const pageResults = results.results

	const offset = (page - 1) * pageSize
	const limit = pageSize

	return {
		count,
		totalPages,
		pageTotalResults,
		pageSize,
		page,
		links,
		results: pageResults,
		offset,
		limit
	} satisfies Pagination<T>
}
