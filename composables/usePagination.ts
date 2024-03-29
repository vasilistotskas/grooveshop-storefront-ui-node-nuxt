import type { Pagination } from '~/types/pagination'

export const usePagination = <T>(results: Pagination<T>) => {
  const count = results.count

  const totalPages = results.totalPages
  const pageTotalResults = results.pageTotalResults

  const pageSize = results.pageSize

  const page = results.page

  const links = results.links
  const pageResults = results.results

  const offset = (page ? page - 1 : 0) * pageSize
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
    limit,
  }
}
