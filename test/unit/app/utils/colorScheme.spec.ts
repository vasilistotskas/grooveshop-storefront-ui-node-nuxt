import { describe, expect, it } from 'vitest'
import { colorSchemeClass } from '~/utils/colorScheme'

/**
 * A band's colour scheme as the classes that draw it: Nuxt UI's own subtree
 * switch for light and dark with the scheme's text colour (`body` paints it in
 * the page's scheme), and no class at all for the page's own scheme.
 */
describe('colorSchemeClass', () => {
  it.each([
    ['light', 'light text-default'],
    ['dark', 'dark text-default'],
    ['auto', undefined],
    [undefined, undefined],
  ] as const)('draws %s as %s', (scheme, expected) => {
    expect(colorSchemeClass(scheme)).toBe(expected)
  })
})
