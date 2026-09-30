import { describe, it, expect } from 'vitest'
import { isCustomPageSlug } from '~/utils/customPageSlug'

/**
 * The `validate` of the catch-all `/[slug]` page: what it rejects is a
 * 404 before any layout is fetched. The rendered status for a rejected
 * slug is asserted end to end in test/e2e/pageRenders.ts.
 */
describe('isCustomPageSlug', () => {
  it.each([['our-story'], ['about2'], ['2026-offers'], ['a']])('accepts %s', (slug) => {
    expect(isCustomPageSlug(slug)).toBe(true)
  })

  it.each([
    ['Our-Story', 'uppercase'],
    ['our_story', 'an underscore'],
    ['our story', 'a space'],
    ['σελίδα', 'non-ASCII'],
    ['our-story.md', 'a dot'],
    ['', 'nothing'],
  ])('rejects %s (%s)', (slug) => {
    expect(isCustomPageSlug(slug)).toBe(false)
  })

  it.each([['api'], ['account'], ['products'], ['blog'], ['cart'], ['checkout'], ['search']])(
    'never claims the reserved top-level path %s',
    (slug) => {
      expect(isCustomPageSlug(slug)).toBe(false)
    },
  )

  it.each([[undefined], [['our', 'story']], [42]])('rejects a param that is not one string: %j', (slug) => {
    expect(isCustomPageSlug(slug)).toBe(false)
  })
})
