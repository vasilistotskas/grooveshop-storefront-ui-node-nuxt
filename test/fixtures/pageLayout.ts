import type { PageLayout, PageSection } from '~~/shared/openapi/types.gen'
import { fixtureUuid } from './product'

/**
 * A `PageSection` as the page-config route serves it, valid against the
 * generated `zPageSection` (proved by `test/unit/fixtures/pageLayout.spec.ts`).
 *
 * Defaults: a visible, prop-less `spacer` in first position; `uuid`
 * follows `id`. An explicit override wins.
 */
export function makePageSection(overrides: Partial<PageSection> = {}): PageSection {
  const id = overrides.id ?? 1

  return {
    id,
    uuid: fixtureUuid(31, id),
    componentType: 'spacer',
    title: '',
    isVisible: true,
    props: {},
    sortOrder: 0,
    ...overrides,
  }
}

/**
 * A `PageLayout`, the public per-locale layout, valid against the generated
 * `zPageLayout`.
 *
 * Defaults: a published `about` layout with no SEO and no sections; `uuid`
 * follows `id`. An explicit override wins.
 */
export function makePageLayout(overrides: Partial<PageLayout> = {}): PageLayout {
  const id = overrides.id ?? 1

  return {
    id,
    uuid: fixtureUuid(32, id),
    pageType: 'about',
    title: 'About',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    isPublished: true,
    metadata: {},
    sections: [],
    ...overrides,
  }
}
