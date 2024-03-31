import {
  type CursorStates,
  PaginationCursorStateEnum,
} from '~/types/global/general'

export function getCursorFromUrl(
  url: string,
  cursorQueryParam: string = 'cursor',
) {
  const parsedUrl = new URL(url)
  return parsedUrl.searchParams.get(cursorQueryParam)
}

export function generateInitialCursorStates(): CursorStates {
  const initialState: CursorStates = {}

  for (const value of Object.values(PaginationCursorStateEnum)) {
    initialState[value] = ''
  }

  return initialState
}

export function clearCursorStates(cursorStates: CursorStates) {
  for (const key of Object.keys(cursorStates)) {
    cursorStates[key as PaginationCursorStateEnum] = ''
  }
}
