export function stripHtml(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<\/?[^>]+(>|$)/g, '')
  }
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
