import type { NavigationMenuItem } from '@nuxt/ui'

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
 * The menu's items with the current section marked for assistive
 * technology. Reka marks a plain link `aria-current="page"` itself, but
 * an entry that opens a dropdown renders as its trigger, which never
 * does, so on a product or an article no entry said where the visitor
 * was. Nuxt UI hands an item's `aria-*` keys to the element it draws.
 */
export function withCurrentPage<T extends { active?: boolean }>(items: T[]): (T & { 'aria-current'?: 'page' })[] {
  return items.map(item => ({ ...item, 'aria-current': item.active ? 'page' as const : undefined }))
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
 * `toggle.label` names the button after its section; `toggle.class` sets it
 * beside its link in the design's spacing; `toggle.open` is the section
 * whose panel is open (the menu's `v-model`).
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
    if (!item.slot && !item.children?.length) return [item]
    const { slot, children, value, ...link } = item
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
      'ui': { ...item.ui, linkLabel: 'sr-only' },
      ...(toggle.open === section ? {} : { 'aria-controls': undefined }),
    }
    return [name, button]
  })
}
