export function stripHtml(htmlString: string) {
  if (import.meta.server) return ''
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlString
  return tempDiv.textContent || tempDiv.innerText || ''
}
