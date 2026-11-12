import { describe, it, expect } from 'vitest'
import { currentMark, menuDropdownFor, withDropdownToggles } from '~/utils/menuDropdown'

/**
 * Which header link opens a dropdown of live categories: the listing and
 * the blog, whichever language prefix the store's menu row carries, and
 * nothing that only looks like them.
 */
describe('menuDropdownFor', () => {
  it.each([
    { path: '/products', dropdown: 'shop' },
    { path: '/en/products', dropdown: 'shop' },
    { path: '/products/', dropdown: 'shop' },
    { path: '/blog', dropdown: 'blog' },
    { path: '/en/blog', dropdown: 'blog' },
  ])('opens the $dropdown dropdown from $path', ({ path, dropdown }) => {
    expect(menuDropdownFor(path)).toBe(dropdown)
  })

  it.each([
    { path: undefined },
    { path: '' },
    { path: '/' },
    { path: '/products/category/1/charging' },
    { path: '/blog/categories' },
    { path: '/products-guide' },
    { path: '/offers' },
  ])('opens none from $path', ({ path }) => {
    expect(menuDropdownFor(path)).toBeUndefined()
  })
})

/**
 * A section with a panel is its link plus a button that opens the panel;
 * both carry the section's value, the button marks itself as the toggle
 * (`useMenuPanels` reads both marks), and the button has no destination,
 * so Nuxt UI draws it as a `<button>` trigger.
 */
describe('currentMark', () => {
  it.each([
    { case: 'its own page', active: true, to: '/products', at: '/products', mark: 'page' },
    { case: 'its own page, filtered', active: true, to: '/products?sort=-createdAt', at: '/products/', mark: 'page' },
    { case: 'its own page in English', active: true, to: '/en/products', at: '/en/products', mark: 'page' },
    { case: 'its own page, written with a trailing slash by the store', active: true, to: '/products/', at: '/products', mark: 'page' },
    { case: 'a page inside its section', active: true, to: '/products', at: '/products/7/cable', mark: 'location' },
    { case: 'a button with no link of its own', active: true, to: undefined, at: '/account/orders', mark: 'location' },
    { case: 'another section', active: false, to: '/products', at: '/products', mark: undefined },
  ])('marks an entry on $case as $mark', ({ active, to, at, mark }) => {
    expect(currentMark(active, to, at)).toBe(mark)
  })
})

describe('withDropdownToggles', () => {
  const CATEGORIES = [{ label: 'Φόρτιση', to: '/products/category/1/charging' }]

  it('splits a section with a panel into its link and its marked button', () => {
    const items = withDropdownToggles([
      { label: 'Κατάστημα', to: '/products', value: 'products', slot: 'shop', children: CATEGORIES },
      { label: 'Προσφορές', to: '/offers' },
    ], { label: section => `Μενού: ${section}` })

    expect(items).toEqual([
      { 'label': 'Κατάστημα', 'to': '/products', 'data-menu-section': 'products' },
      expect.objectContaining({ 'label': 'Μενού: Κατάστημα', 'value': 'products', 'slot': 'shop', 'children': CATEGORIES, 'data-menu-section': 'products', 'data-menu-toggle': '' }),
      { label: 'Προσφορές', to: '/offers' },
    ])
    expect(items[1]).not.toHaveProperty('to')
  })

  // The button is an arrow alone, its name for screen readers only; the
  // arrow sits in the middle of a target wider than itself.
  it('draws the button as its arrow alone, in the middle of its target, in the design\'s classes', () => {
    const [, button] = withDropdownToggles(
      [{ label: 'Κατάστημα', to: '/products', value: 'products', slot: 'shop', children: CATEGORIES }],
      { label: section => `Μενού: ${section}`, class: 'min-w-6' },
    )

    expect(button!.class).toBe('min-w-6')
    expect(button!.ui).toEqual({ linkLabel: 'sr-only', linkTrailing: 'ms-0' })
  })

  // A design names the slot its panel is drawn in; with nothing to list
  // (none, switched off, failed to load) there is no panel to draw.
  it('leaves a section with nothing to list one plain link, whatever slot it names', () => {
    const items = withDropdownToggles([
      { label: 'Κατάστημα', to: '/products', value: 'products', slot: 'shop', children: [] },
      { label: 'Blog', to: '/blog', value: 'blog', slot: 'blog' },
    ], { label: section => `Μενού: ${section}` })

    expect(items).toEqual([
      { label: 'Κατάστημα', to: '/products', value: 'products' },
      { label: 'Blog', to: '/blog', value: 'blog' },
    ])
  })

  // Reka renders `aria-controls=""` before it mounts; `undefined` on the
  // item leaves the attribute out while the panel is closed.
  it('leaves aria-controls to Reka only on the open section\'s button', () => {
    const sections = [{ label: 'Κατάστημα', to: '/products', value: 'products', slot: 'shop', children: CATEGORIES }]
    const label = (section: string) => `Μενού: ${section}`

    const closed = withDropdownToggles(sections, { label })[1]!
    const open = withDropdownToggles(sections, { label, open: 'products' })[1]!

    expect(Object.entries(closed)).toContainEqual(['aria-controls', undefined])
    expect(open).not.toHaveProperty('aria-controls')
  })
})
