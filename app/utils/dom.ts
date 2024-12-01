export function stripHtml(htmlString: string) {
  return htmlString.replace(/<\/?[^>]+(>|$)/g, '')
}
