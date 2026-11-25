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

/**
 * An address with most of its name hidden, for saying where a mail went
 * ("m***@example.com"): enough for its owner to know which one, little for
 * whoever else is reading the screen. An address with no name or no domain
 * is returned as it came.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at < 1) return email
  return `${email.charAt(0)}***${email.slice(at)}`
}

export function cleanHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '')
}
