export function getDisplayTitle(result: SearchResult): string {
  if (isProductResult(result)) {
    if (result?.name) {
      return stripHtml(result.name)
    }
    return result.name || ''
  }
  else {
    if (result?.title) {
      return stripHtml(result.title)
    }
    return result.title || ''
  }
}

export function getDisplaySubtitle(result: SearchResult, maxLength = 150): string {
  if (isProductResult(result)) {
    if (result?.description) {
      return stripHtml(result.description)
    }
    if (result?.description) {
      const text = stripHtml(result.description)
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }
    return result.description || ''
  }
  else {
    if (result?.subtitle) {
      return stripHtml(result.subtitle)
    }
    if (result?.body) {
      const text = stripHtml(result.body)
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }
    return result.subtitle || ''
  }
}

export function getResultIcon(result: SearchResult): string {
  return result.contentType === 'product'
    ? 'i-lucide-shopping-bag'
    : 'i-lucide-file-text'
}
