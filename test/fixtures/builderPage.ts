/**
 * A section of a published page as `GET /api/builder/pages/<key>` serves it
 * (proved by `test/unit/fixtures/builderPage.spec.ts`).
 *
 * Defaults: a prop-less `spacer`; the id follows an `n`th counter so two
 * sections of one page differ. An explicit override wins.
 */
let sectionCount = 0

export function makeBuilderSection(overrides: Partial<BuilderSection> = {}): BuilderSection {
  sectionCount += 1
  return {
    id: `section-${sectionCount}`,
    componentType: 'spacer',
    props: {},
    ...overrides,
  }
}

/**
 * A published page: the route's `{ page }` answer, which is `null` for a page
 * the store has not built. Defaults: a page with no settings and no sections.
 */
export function makeBuilderPage(overrides: Partial<BuilderPage> = {}): BuilderPage {
  return { sections: [], ...overrides }
}
