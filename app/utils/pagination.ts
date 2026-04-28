const CURSOR_STATE_KEYS = ['blogPostsCursor', 'blogPostCommentsCursor'] as const

export function getCursorFromUrl(
  url: string,
  cursorQueryParam: string = 'cursor',
) {
  const parsedUrl = new URL(url)
  return parsedUrl.searchParams.get(cursorQueryParam)
}

export function generateInitialCursorState(): CursorState {
  const initialState: CursorState = {}

  for (const value of CURSOR_STATE_KEYS) {
    initialState[value] = ''
  }

  return initialState
}

export function clearCursorState() {
  const cursorState = useState<CursorState>('cursor-state')
  cursorState.value = generateInitialCursorState()
}
