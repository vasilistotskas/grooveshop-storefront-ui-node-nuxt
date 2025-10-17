import type { CursorState } from '#shared/types/pagination'
import { PaginationCursorStateEnum } from '#shared/types/enum'

export function getCursorFromUrl(
  url: string,
  cursorQueryParam: string = 'cursor',
) {
  const parsedUrl = new URL(url)
  return parsedUrl.searchParams.get(cursorQueryParam)
}

export function generateInitialCursorState(): CursorState {
  const initialState: CursorState = {}

  for (const value of Object.values(PaginationCursorStateEnum)) {
    initialState[value] = ''
  }

  return initialState
}

export function clearCursorState() {
  const cursorState = useState<CursorState>('cursor-state')
  cursorState.value = generateInitialCursorState()
}
