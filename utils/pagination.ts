export function getCursorFromUrl(
  url: string,
  cursorQueryParam: string = 'cursor',
) {
  const parsedUrl = new URL(url)
  return parsedUrl.searchParams.get(cursorQueryParam)
}
