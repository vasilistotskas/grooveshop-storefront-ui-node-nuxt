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

export function getResultIcon(result: SearchResult): string {
  return result.contentType === 'product'
    ? 'i-heroicons-shopping-bag'
    : 'i-heroicons-document-text'
}
