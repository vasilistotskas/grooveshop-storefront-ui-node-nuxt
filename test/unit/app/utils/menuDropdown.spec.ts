import { describe, it, expect } from 'vitest'
import { menuDropdownFor, withDropdownToggles } from '~/utils/menuDropdown'

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
describe('withDropdownToggles', () => {
  it('splits a section with a panel into its link and its marked button', () => {
    const items = withDropdownToggles([
      { label: 'Κατάστημα', to: '/products', value: 'products', slot: 'shop' },
      { label: 'Προσφορές', to: '/offers' },
    ], { label: section => `Μενού: ${section}` })

    expect(items).toEqual([
      { 'label': 'Κατάστημα', 'to': '/products', 'data-menu-section': 'products' },
      expect.objectContaining({ 'label': 'Μενού: Κατάστημα', 'value': 'products', 'slot': 'shop', 'data-menu-section': 'products', 'data-menu-toggle': '' }),
      { label: 'Προσφορές', to: '/offers' },
    ])
    expect(items[1]).not.toHaveProperty('to')
  })

  // Reka renders `aria-controls=""` before it mounts; `undefined` on the
  // item leaves the attribute out while the panel is closed.
  it('leaves aria-controls to Reka only on the open section\'s button', () => {
    const sections = [{ label: 'Κατάστημα', to: '/products', value: 'products', slot: 'shop' }]
    const label = (section: string) => `Μενού: ${section}`

    const closed = withDropdownToggles(sections, { label })[1]!
    const open = withDropdownToggles(sections, { label, open: 'products' })[1]!

    expect(Object.entries(closed)).toContainEqual(['aria-controls', undefined])
    expect(open).not.toHaveProperty('aria-controls')
  })
})
