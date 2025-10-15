export function getDisplayTitle(result: SearchResult): string {
  if (isProductResult(result)) {
    if (result?.name) {
      return stripHtml(result.name)
    }
    return ''
  }
  else {
    if (result?.title) {
      return stripHtml(result.title)
    }
    return ''
  }
}

export function getDisplaySubtitle(result: SearchResult, maxLength = 150): string {
  if (isProductResult(result)) {
    if (result?.description) {
      const text = stripHtml(result.description)
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }
    return ''
  }
  else {
    if (result?.subtitle) {
      return stripHtml(result.subtitle)
    }
    if (result?.body) {
      const text = stripHtml(result.body)
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
