import type { NavigationMenuItem } from '@nuxt/ui'
import { parsePath, withoutTrailingSlash } from 'ufo'

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

/**
 * What `aria-current` a navigation entry carries, the one rule for every
 * menu that marks a section active on the pages under it (the headers,
 * the tab bars, the account's sidebar, in every design): `page` when the
 * entry leads to the page on screen (its query aside), `location` when the
 * page is inside the entry's section (a product under Shop, an order under
 * Orders), nothing when it is neither. `page` on Shop while a product is
 * on screen told a screen reader that Shop was the page it was reading.
 *
 * `to` and `currentPath` are paths of the same kind: both with their
 * language prefix, or both without.
 */
export function currentMark(active: boolean | undefined, to: unknown, currentPath: string): 'page' | 'location' | undefined {
  if (!active) return undefined
  const target = typeof to === 'string' ? withoutTrailingSlash(parsePath(to).pathname) : undefined
  return target === withoutTrailingSlash(currentPath) ? 'page' : 'location'
}

/**
 * The menu's items with the current section marked for assistive
 * technology (`currentMark`). Reka marks a plain link
 * `aria-current="page"` itself, and an entry that opens a dropdown renders
 * as its trigger, which it never marks, so on a product or an article no
 * entry said where the visitor was. Nuxt UI hands an item's `aria-*` keys
 * to the element it draws, over Reka's own.
 */
export function withCurrentPage<T extends { active?: boolean, to?: unknown }>(items: T[], currentPath: string): (T & { 'aria-current'?: 'page' | 'location' })[] {
  return items.map(item => ({ ...item, 'aria-current': currentMark(item.active, item.to, currentPath) }))
}

/**
 * Every entry that opens a panel as TWO entries: the link to its section,
 * then a button that opens the panel (WAI-ARIA's disclosure navigation:
 * a link plus an adjacent disclosure button).
 *
 * One entry could not be both. Nuxt UI draws an entry with a panel and a
 * `to` as Reka's NavigationMenuTrigger on an `<a>`: a keyboard's Enter
 * followed the link and the panel was out of reach, and the trigger gave
 * nothing to act on. An entry without a `to` is drawn as a `<button>`
 * trigger, which Enter and Space open, which states `aria-expanded` and
 * `aria-controls`, whose ArrowDown moves into the panel and whose Escape
 * comes back to it (Reka's NavigationMenuTrigger / NavigationMenuContentImpl).
 * The link stays a link in the server's HTML, before anything hydrates.
 *
 * A section has a panel only when it has something to show: its
 * `children`, the entries the panel lists. Its `slot` only says where a
 * design draws that panel. With no children (none, the feature switched
 * off, the list failed to load: the menus' composables answer an empty
 * list for all three) the entry is one plain link, its slot dropped, and
 * no arrow beside it opens an empty panel.
 *
 * `toggle.label` names the button after its section; `toggle.class` sets it
 * beside its link in the design's spacing and sizes its target;
 * `toggle.open` is the section whose panel is open (the menu's `v-model`).
 * The button's arrow sits in its middle (`linkTrailing` without Nuxt UI's
 * `ms-auto`, which pushed it to the end of a target wider than itself).
 *
 * A closed section's button states no `aria-controls`. Reka 2.11 binds it
 * to an id it assigns in `onMounted`, so the server's HTML, and the page
 * until the lazy menu hydrates, carried `aria-controls=""`, an empty IDREF;
 * once hydrated it named a panel that is not in the page while closed
 * (`unmountOnHide`). An item's `aria-*` keys reach the element Nuxt UI
 * draws and win over Reka's own (Reka's `Slot` merges the child's props
 * last), so `undefined` here leaves the attribute out; an open section's
 * button keeps Reka's id for its panel.
 */
export function withDropdownToggles(
  items: NavigationMenuItem[],
  toggle: { label: (section: string) => string, class?: string, open?: string },
): NavigationMenuItem[] {
  return items.flatMap((item) => {
    const { slot, children, value, ...link } = item
    if (!children?.length) return [value === undefined ? link : { ...link, value }]
    // The open panel is named by this value; the name and the button both
    // carry it, so the mouse on either opens the same panel (`useMenuPanels`).
    const section = String(value ?? item.to ?? item.label)
    const name: NavigationMenuItem = { ...link, 'data-menu-section': section }
    const button: NavigationMenuItem = {
      'label': toggle.label(item.label ?? ''),
      'value': section,
      'data-menu-section': section,
      'data-menu-toggle': '',
      'slot': slot,
      'children': children,
      'class': toggle.class,
      'ui': { ...item.ui, linkLabel: 'sr-only', linkTrailing: 'ms-0' },
      ...(toggle.open === section ? {} : { 'aria-controls': undefined }),
    }
    return [name, button]
  })
}
