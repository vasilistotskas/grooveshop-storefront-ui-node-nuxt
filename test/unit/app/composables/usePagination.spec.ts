import { describe, it, expect } from 'vitest'
import { usePagination } from '~/composables/usePagination'
import type { Pagination } from '~~/shared/types/pagination'

describe('usePagination', () => {
  it('passes the page metadata and results through', () => {
    const results: Pagination<{ id: number }> = {
      count: 100,
      totalPages: 10,
      pageTotalResults: 2,
      pageSize: 10,
      page: 3,
      links: { next: '/api/items?page=4', previous: '/api/items?page=2' },
      results: [{ id: 1 }, { id: 2 }],
    }

    expect(usePagination(results)).toEqual({
      count: 100,
      totalPages: 10,
      pageTotalResults: 2,
      pageSize: 10,
      page: 3,
      links: results.links,
      results: results.results,
      offset: 20,
      limit: 10,
    })
  })

  it.each([
    ['the first page', 1, 10, 0],
    ['the second page', 2, 10, 10],
    ['the last of ten pages', 10, 10, 90],
    ['a page size of 25', 3, 25, 50],
    ['a page size of 1', 5, 1, 4],
    ['page 0, as the first page', 0, 10, 0],
    ['no page, as the first page', undefined, 10, 0],
  ])('computes the offset for %s', (_label, page, pageSize, offset) => {
    const pagination = usePagination({ count: 100, page, pageSize, results: [] } as Pagination<unknown>)

    expect(pagination.offset).toBe(offset)
    expect(pagination.limit).toBe(pageSize)
  })

  it('defaults the page size to 10', () => {
    const pagination = usePagination({ count: 100, page: 3, results: [] } as Pagination<unknown>)

    expect(pagination).toMatchObject({ pageSize: 10, limit: 10, offset: 20 })
  })

  // Nothing rounds a fractional page: it passes straight into the offset.
  it('does not round a fractional page', () => {
    const pagination = usePagination({ count: 100, pageSize: 10, page: 2.5, results: [] } as Pagination<unknown>)

    expect(pagination.offset).toBe(15)
  })
})
