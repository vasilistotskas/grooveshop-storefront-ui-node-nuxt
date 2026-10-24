/**
 * A page's `<title>`: the page's own title, then the store's name, once.
 *
 * Merchants write their own SEO titles, and many end them with the store's
 * name ("Mini Power Bank – Μαύρο | Webside"). Appending the name to those
 * as well produced "… | Webside | Webside" in every search result for the
 * page. So the name is added only when the title does not already end
 * with it (after an optional separator), and is the whole title when the
 * page has none. Ending, not containing: a product named after the brand
 * ("Webside Mini Power Bank") still gets the store's name after it.
 */
export function storeTitle(title: string | undefined, storeName: string | undefined, separator: string | undefined): string {
  const own = title?.trim() ?? ''
  const name = storeName?.trim() ?? ''
  if (!name) return own
  if (!own) return name
  if (endsWithName(own, name)) return own
  const between = separator?.trim()
  return between ? `${own} ${between} ${name}` : `${own} ${name}`
}

function endsWithName(title: string, name: string): boolean {
  const lowerTitle = title.toLocaleLowerCase()
  const lowerName = name.toLocaleLowerCase()
  if (!lowerTitle.endsWith(lowerName)) return false
  // The name must stand on its own: "Webside" ends "Τα νέα του Webside"
  // only as a word, never as the tail of "Superwebside".
  const before = lowerTitle.slice(0, lowerTitle.length - lowerName.length)
  return before === '' || /[\s\p{P}\p{S}]$/u.test(before)
}
