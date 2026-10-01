export function capitalize(str: string, allWords = false): string {
  if (allWords) {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function contentShorten(
  content: string | null | undefined = '',
  from = 0,
  to = 200,
  suffix = '...',
): string {
  if (!content) return ''

  if (content.length <= to) return content
  return content.substring(from, to) + suffix
}

export function cleanHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '')
}
