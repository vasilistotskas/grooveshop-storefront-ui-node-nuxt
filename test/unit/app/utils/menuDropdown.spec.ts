import { describe, it, expect } from 'vitest'
import { menuDropdownFor } from '~/utils/menuDropdown'

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
