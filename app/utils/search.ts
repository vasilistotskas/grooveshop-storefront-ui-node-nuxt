import type { SearchResult } from '#shared/types/search'
import { isProductResult } from '#shared/types/search'
import { cleanHtml } from './str'

export function getDisplayTitle(result: SearchResult): string {
  if (isProductResult(result)) {
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
  if (isProductResult(result)) {
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

export function getResultIcon(result: SearchResult): string {
  return result.contentType === 'product'
    ? 'i-lucide-shopping-bag'
    : 'i-lucide-file-text'
}
