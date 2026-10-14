import { describe, expect, it } from 'vitest'

import {
  FONT_ALLOWLIST,
  FONT_FAMILY_NAMES,
  FONT_STYLES,
  FONT_WEIGHTS,
} from '../../../../shared/theme/constants'

/**
 * `nuxt.config.ts` builds the `@nuxt/fonts` declarations from these
 * tables by key, so a family in one and not the others is a font the
 * stack names but the build never ships (or the reverse).
 */
describe('font tables', () => {
  it('declare a build family for every named stack except the system one', () => {
    const stacks = Object.keys(FONT_ALLOWLIST).filter(key => key !== 'system')
    expect(Object.keys(FONT_FAMILY_NAMES).sort()).toEqual(stacks.sort())
  })

  it('name each family first in its own stack', () => {
    for (const [key, name] of Object.entries(FONT_FAMILY_NAMES)) {
      expect(FONT_ALLOWLIST[key]).toMatch(new RegExp(`^"${name}",`))
    }
  })

  it('only override weights and styles for declared families', () => {
    for (const key of [...Object.keys(FONT_WEIGHTS), ...Object.keys(FONT_STYLES)]) {
      expect(FONT_FAMILY_NAMES).toHaveProperty(key)
    }
  })

  it('ships Vollkorn with the weights and the italic the Φυτειά design sets', () => {
    expect(FONT_WEIGHTS.vollkorn).toEqual([500, 600, 700, 800, 900])
    expect(FONT_STYLES.vollkorn).toEqual(['normal', 'italic'])
  })

  it('keeps Commissioner on the global weights and upright only', () => {
    expect(FONT_WEIGHTS).not.toHaveProperty('commissioner')
    expect(FONT_STYLES).not.toHaveProperty('commissioner')
  })
})
