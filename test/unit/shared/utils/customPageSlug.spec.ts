import { describe, it, expect } from 'vitest'
import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import { isCustomPageSlug } from '~~/shared/utils/customPageSlug'
import { STATIC_LAYOUT_ROUTES } from '~~/shared/utils/staticLayoutRoutes'

/**
 * Which `/<slug>` is a custom page: the catch-all `/[slug]` page's
 * `validate` (what it rejects is a 404 before any layout is fetched) and
 * the sitemap's test for listing a published layout. The rendered status
 * for a rejected slug is asserted end to end in test/e2e/pageRenders.ts;
 * that every static route is reserved is
 * test/unit/source-rules/static-layout-routes.spec.ts.
 */
describe('isCustomPageSlug', () => {
  it.each([['our-story'], ['about2'], ['2026-offers'], ['a'], ['kelari']])('accepts %s', (slug) => {
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

  // `/home` rendered the home layout a second time, under its own
  // canonical, on every store.
  it.each(Object.keys(STATIC_LAYOUT_ROUTES))('never claims %s, a page type a static route renders', (pageType) => {
    expect(isCustomPageSlug(pageType)).toBe(false)
  })

  it.each([...SUPPORTED_LOCALES])('never claims the locale prefix %s', (locale) => {
    expect(isCustomPageSlug(locale)).toBe(false)
  })

  it.each([['acp'], ['chat'], ['feeds'], ['mcp']])('never claims %s, which the ingress routes to the agent gateway', (slug) => {
    expect(isCustomPageSlug(slug)).toBe(false)
  })

  it.each([[undefined], [['our', 'story']], [42]])('rejects a param that is not one string: %j', (slug) => {
    expect(isCustomPageSlug(slug)).toBe(false)
  })
})
