export function stripHtml(htmlString: string) {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlString
  return tempDiv.textContent || tempDiv.innerText || ''
}
