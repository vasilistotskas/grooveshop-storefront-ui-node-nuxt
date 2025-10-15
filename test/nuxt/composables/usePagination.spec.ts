import { describe, it, expect } from 'vitest'
import { usePagination } from '~/composables/usePagination'

describe('usePagination', () => {
  it('should extract pagination data from results', () => {
    const results: Pagination<any> = {
      count: 100,
      totalPages: 10,
      pageTotalResults: 10,
      pageSize: 10,
      page: 1,
      links: {
        next: '/api/items?page=2',
        previous: null,
      },
      results: [{ id: 1 }, { id: 2 }],
    }

    const pagination = usePagination(results)

    expect(pagination.count).toBe(100)
    expect(pagination.totalPages).toBe(10)
    expect(pagination.pageTotalResults).toBe(10)
    expect(pagination.pageSize).toBe(10)
    expect(pagination.page).toBe(1)
    expect(pagination.links).toEqual(results.links)
    expect(pagination.results).toEqual(results.results)
  })

  it('should calculate offset for first page', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 10,
      page: 1,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(0)
    expect(pagination.limit).toBe(10)
  })

  it('should calculate offset for second page', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 10,
      page: 2,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(10)
    expect(pagination.limit).toBe(10)
  })

  it('should calculate offset for third page', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 10,
      page: 3,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(20)
    expect(pagination.limit).toBe(10)
  })

  it('should handle different page sizes', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 25,
      page: 2,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(25)
    expect(pagination.limit).toBe(25)
  })

  it('should use default page size of 10 when not provided', () => {
    const results: Pagination<any> = {
      count: 100,
      page: 1,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.pageSize).toBe(10)
    expect(pagination.limit).toBe(10)
  })

  it('should handle page 0 as first page', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 10,
      page: 0,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(0)
  })

  it('should handle undefined page as first page', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 10,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(0)
  })

  it('should handle large page numbers', () => {
    const results: Pagination<any> = {
      count: 10000,
      pageSize: 10,
      page: 100,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(990)
    expect(pagination.limit).toBe(10)
  })

  it('should handle page size of 1', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 1,
      page: 50,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(49)
    expect(pagination.limit).toBe(1)
  })

  it('should handle large page size', () => {
    const results: Pagination<any> = {
      count: 1000,
      pageSize: 100,
      page: 5,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(400)
    expect(pagination.limit).toBe(100)
  })

  it('should preserve all pagination metadata', () => {
    const results: Pagination<any> = {
      count: 250,
      totalPages: 25,
      pageTotalResults: 10,
      pageSize: 10,
      page: 5,
      links: {
        next: '/api/items?page=6',
        previous: '/api/items?page=4',
      },
      results: [{ id: 41 }, { id: 42 }, { id: 43 }],
    }

    const pagination = usePagination(results)

    expect(pagination.count).toBe(250)
    expect(pagination.totalPages).toBe(25)
    expect(pagination.pageTotalResults).toBe(10)
    expect(pagination.pageSize).toBe(10)
    expect(pagination.page).toBe(5)
    expect(pagination.links.next).toBe('/api/items?page=6')
    expect(pagination.links.previous).toBe('/api/items?page=4')
    expect(pagination.results).toHaveLength(3)
  })

  it('should handle empty results', () => {
    const results: Pagination<any> = {
      count: 0,
      totalPages: 0,
      pageTotalResults: 0,
      pageSize: 10,
      page: 1,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.count).toBe(0)
    expect(pagination.results).toEqual([])
    expect(pagination.offset).toBe(0)
  })

  it('should handle null links', () => {
    const results: Pagination<any> = {
      count: 10,
      pageSize: 10,
      page: 1,
      links: null,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.links).toBeNull()
  })

  it('should handle undefined links', () => {
    const results: Pagination<any> = {
      count: 10,
      pageSize: 10,
      page: 1,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.links).toBeUndefined()
  })

  it('should calculate correct offset and limit for last page', () => {
    const results: Pagination<any> = {
      count: 95,
      totalPages: 10,
      pageSize: 10,
      page: 10,
      results: [],
    }

    const pagination = usePagination(results)

    expect(pagination.offset).toBe(90)
    expect(pagination.limit).toBe(10)
  })

  it('should handle fractional page numbers by flooring', () => {
    const results: Pagination<any> = {
      count: 100,
      pageSize: 10,
      page: 2.5,
      results: [],
    }

    const pagination = usePagination(results)

    // (2.5 - 1) * 10 = 15
    expect(pagination.offset).toBe(15)
  })
})
