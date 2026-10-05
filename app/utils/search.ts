import { cleanHtml } from './str'

function isProduct(result: SearchResult): result is ProductMeiliSearchResult {
  return result?.contentType === 'product'
}

export function getDisplayTitle(result: SearchResult): string {
  if (isProduct(result)) {
    if (result?.name) {
      return cleanHtml(result.name)
    }
    return ''
  }
  else {
    if (result?.title) {
      return cleanHtml(result.title)
    }
    return ''
  }
}

export function getDisplaySubtitle(result: SearchResult, maxLength = 150): string {
  if (isProduct(result)) {
    if (result?.description) {
      const text = cleanHtml(result.description)
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }
    return ''
  }
  else {
    if (result?.subtitle) {
      return cleanHtml(result.subtitle)
    }
    if (result?.body) {
      const text = cleanHtml(result.body)
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }
    return ''
  }
}

/** A run of text, flagged when it is one of the words the shopper typed. */
export interface HighlightSegment {
  text: string
  match: boolean
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * `text` split into runs, the ones matching a word of `query` (two
 * characters or more, any case) flagged, so a result's title can show why
 * it matched. No markup is built here: the caller renders the runs, so
 * nothing in `text` is ever read as HTML.
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const words = [...new Set(query.trim().split(/\s+/).filter(word => word.length >= 2))]
    .sort((a, b) => b.length - a.length)
  if (!text || !words.length) return [{ text, match: false }]

  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi')
  // With one capture group, `split` alternates: text, match, text, match…
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter(segment => segment.text)
}
