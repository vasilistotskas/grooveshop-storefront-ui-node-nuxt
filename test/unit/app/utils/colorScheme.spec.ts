import { describe, expect, it } from 'vitest'
import { colorSchemeClass } from '~/utils/colorScheme'

/**
 * A band's colour scheme as the class that draws it: Nuxt UI's own subtree
 * switch for light and dark, and no class at all for the page's own scheme.
 */
describe('colorSchemeClass', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    ['auto', undefined],
    [undefined, undefined],
  ] as const)('draws %s as %s', (scheme, expected) => {
    expect(colorSchemeClass(scheme)).toBe(expected)
  })
})
