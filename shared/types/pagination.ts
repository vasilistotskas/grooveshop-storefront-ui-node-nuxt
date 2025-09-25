export type Pagination<T> = {
  links?: {
    next?: string | null
    previous?: string | null
  }
  count: number
  totalPages?: number
  pageSize?: number
  pageTotalResults?: number
  page?: number
  results: T[]
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
