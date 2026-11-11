/**
 * The header entries that open a dropdown of live categories, by the
 * listing they link to: the products listing opens the catalogue's
 * categories, the blog its topics. Every design's header and phone menu
 * reads this, for its built-in entries and for the links a store
 * configured alike, so an operator's "Κατάστημα" row keeps the dropdown.
 */
export type MenuDropdown = 'shop' | 'blog'

const DROPDOWN_BY_PATH: Readonly<Record<string, MenuDropdown>> = {
  '/products': 'shop',
  '/blog': 'blog',
}

/**
 * Which dropdown a link to `path` opens, if any. Compared without the
 * locale prefix, because menu rows carry their paths verbatim from
 * Django while everything rendered goes through `localePath()`.
 */
export function menuDropdownFor(path: string | undefined): MenuDropdown | undefined {
  if (!path) return undefined
  return DROPDOWN_BY_PATH[splitLocale(path).route]
}
