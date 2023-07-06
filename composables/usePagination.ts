import { Pagination } from '~/zod/pagination/pagination'

export const usePagination = <T>(results: Pagination<T> | null) => {
	if (!results)
		return {
			resultsCount: 0,
			totalPages: 0,
			pageTotalResults: 0,
			pageSize: 0,
			currentPage: 0,
			links: {
				next: null,
				prev: null
			},
			offset: 0,
			limit: 0
		}
	const resultsCount = results.count

	const totalPages = results.totalPages
	const pageTotalResults = results.pageTotalResults

	const pageSize = results.pageSize

	const currentPage = results.page

	const links = results.links

	const offset = (currentPage - 1) * pageSize
	const limit = pageSize

	return {
		resultsCount,
		totalPages,
		pageTotalResults,
		pageSize,
		currentPage,
		links,
		offset,
		limit
	}
}
