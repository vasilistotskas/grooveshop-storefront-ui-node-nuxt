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

export type PaginationCursorStateType = `${PaginationCursorStateEnum}-${string}`

export type CursorState = {
  [key in PaginationCursorStateEnum | PaginationCursorStateType]?: string | null
}

export type PaginationType = 'pageNumber' | 'cursor' | 'limitOffset'
