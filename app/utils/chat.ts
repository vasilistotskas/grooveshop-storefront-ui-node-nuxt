export type ChatSegment
  = | { type: 'text', text: string }
    | { type: 'products', event: ShopChatProducts }

/**
 * A message's text and its product lists in the order they happened: each
 * list sits at the text offset (`at`) it arrived at, so cards the
 * assistant surfaced before explaining them render before the
 * explanation. Empty text runs are dropped.
 */
export function chatSegments(text: string, products: ShopChatProducts[] = []): ChatSegment[] {
  const segments: ChatSegment[] = []
  let cursor = 0
  const pushText = (end: number) => {
    const run = text.slice(cursor, end)
    if (run.trim() !== '') {
      segments.push({ type: 'text', text: run })
    }
    cursor = end
  }

  for (const event of [...products].sort((a, b) => a.at - b.at)) {
    pushText(Math.min(event.at, text.length))
    segments.push({ type: 'products', event })
  }
  pushText(text.length)
  return segments
}
