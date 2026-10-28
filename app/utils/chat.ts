export type ChatSegment
  = | { type: 'text', text: string }
    | { type: 'products', event: ShopChatProducts }

/**
 * A message's text and its product lists in the order they happened: each
 * list arrives at a text offset (`at`), and renders after the paragraph
 * that offset falls in. The gateway sends a list the moment its tool
 * returns, before the words that introduce it, so a list at the start of a
 * paragraph's words follows them rather than preceding them. Empty text
 * runs are dropped.
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
    const paragraphEnd = text.indexOf('\n\n', Math.min(event.at, text.length))
    pushText(Math.max(cursor, paragraphEnd === -1 ? text.length : paragraphEnd))
    segments.push({ type: 'products', event })
  }
  pushText(text.length)
  return segments
}

/**
 * When to try again, as the page's language says it ("in 5 minutes",
 * "σε 5 λεπτά"), from a wait in seconds: seconds under a minute, then
 * minutes, then hours, each rounded up so the shopper never comes back
 * too early.
 */
export function retryWhen(seconds: number, locale: string): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'always' })
  if (seconds < 60) return format.format(Math.ceil(seconds), 'second')
  if (seconds < 3600) return format.format(Math.ceil(seconds / 60), 'minute')
  return format.format(Math.ceil(seconds / 3600), 'hour')
}
