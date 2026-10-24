/**
 * A page's `<title>` template: the page's own title, then the store's
 * name, once.
 *
 * Merchants write their own SEO titles, and many end them with the store's
 * name ("Mini Power Bank – Μαύρο | Webside"). Appending the name to those
 * as well produced "… | Webside | Webside" in every search result for the
 * page. So the name is added only when the title does not already end
 * with it (after an optional separator), and is the whole title when the
 * page has none. Ending, not containing: a product named after the brand
 * ("Webside Mini Power Bank") still gets the store's name after it.
 *
 * It decides only WHETHER the name follows, and leaves the name and the
 * separator to unhead's template params (`%separator`, `%siteName`):
 * several head entries set them (nuxt-seo-utils resolves the separator
 * from the site config), and the one unhead picks is the one every other
 * title, meta and link on the page uses too.
 */
export function storeTitle(title: string | undefined, storeName: string | undefined): string {
  const own = title?.trim() ?? ''
  const name = storeName?.trim() ?? ''
  if (!own) return name ? '%siteName' : ''
  if (!name || endsWithName(own, name)) return own
  return `${own} %separator %siteName`
}

function endsWithName(title: string, name: string): boolean {
  const foldedTitle = folded(title)
  const foldedName = folded(name)
  if (!foldedTitle.endsWith(foldedName)) return false
  // The name must stand on its own: "Webside" ends "Τα νέα του Webside"
  // only as a word, never as the tail of "Superwebside".
  const before = foldedTitle.slice(0, foldedTitle.length - foldedName.length)
  return before === '' || /[\s\p{P}\p{S}]$/u.test(before)
}

/**
 * Text compared without case or accents. Greek capitals drop the tonos
 * ("ΑΓΡΟΣ" is "Αγρός" in capitals), so a case-only fold would miss a name
 * a merchant typed in capitals. `toLowerCase`, not `toLocaleLowerCase`:
 * the server and the browser must reach the same answer, and a fold that
 * follows the runtime's locale could differ between them.
 */
function folded(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
