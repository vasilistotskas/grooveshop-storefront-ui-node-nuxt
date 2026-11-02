import { describe, expect, it } from 'vitest'
import cases from '~~/test/fixtures/builder/placement-cases.json'
import { builderPlacementAllowed } from '~~/shared/builder/placement'

/**
 * Where a section may sit, as the editor's library filters it. The cases are
 * `test/fixtures/builder/placement-cases.json`, which Django vendors with the
 * catalogue and holds its own `_placement_allowed` to as well: a change on
 * either side that the other does not make fails one of the two suites.
 */
describe('builderPlacementAllowed', () => {
  it.each(cases.map(({ groups, templates, document, allowed }) => [
    `groups ${JSON.stringify(groups)}, templates ${JSON.stringify(templates)} in ${document}`,
    { ...(groups && { groups }), ...(templates && { templates }) },
    document,
    allowed,
  ] as const))('answers for %s as Django does', (_case, definition, document, allowed) => {
    expect(builderPlacementAllowed(definition, document)).toBe(allowed)
  })
})
