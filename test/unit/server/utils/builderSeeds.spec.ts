import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildDesignCatalogue, definitionsForDesign } from '~~/server/utils/builderCatalogue'
import { parseDocument } from '~~/shared/builder/document'
import { OWN_DESIGN_SCHEMAS } from '~~/shared/theme/design'
import { STATIC_LAYOUT_ROUTES } from '~~/shared/utils/staticLayoutRoutes'
import type { StaticLayoutRoute } from '~~/shared/utils/staticLayoutRoutes'
import home from '~~/test/fixtures/builder/seeds/home.json'
import { realBlocks } from '~~/test/helpers/realBlocks'

/**
 * What Django's seeds are tested against, committed so it cannot rot.
 *
 * Under `test/fixtures/builder/`, copied into Django, pinned (its
 * `.github/scripts/sync_upstream_sources.py`), and read by the
 * infrastructure's promote gate at each storefront tag
 * (`scripts/check-api-contract.py`):
 *
 * - `catalogue/<design>.json`: the catalogue payload `GET
 *   /api/builder/catalogue?schema=<design>` serves, pretty-printed, one file
 *   per catalogue the route answers with. A store is served the catalogue of
 *   its design (`buildDesignCatalogue`: its blocks, its theme's contrast rules
 *   and defaults, its page types), so there is one file for each tenant schema
 *   the build names (a block's or a page type's `designs`, a store with its own
 *   design: `OWN_DESIGN_SCHEMAS`), and `default.json` for every other store,
 *   which all get the platform default design's. A new store is one of those.
 * - `seeds/*.json`: the documents a new store starts with, as `{key, document,
 *   i18n}`. They are data, edited by hand and reviewed in the diff; a new store
 *   gets them as its first release. Django seeds them without a catalogue, so
 *   this is where they are held to the real blocks.
 *
 * A block, document-root or page-type change fails the spec until the files
 * are regenerated with
 * `pnpm vitest run --project=unit test/unit/server/utils/builderSeeds.spec.ts -u`
 * and reviewed in the diff. A design that no longer exists leaves its file
 * behind, which the spec names: delete it by hand.
 *
 * Reads the REAL blocks as the build finds them (`test/helpers/realBlocks.ts`:
 * `modules/builder-blocks`' own discovery, sub-folders included), so a block
 * the server bundles cannot be missing from a snapshot.
 */
const definitions = realBlocks

/**
 * The schema `default.json` is built for: one no design names, so it stands
 * for every store whose design is the platform default.
 */
const OTHER_STORE = 'default'

/** Every tenant schema the build serves a catalogue of its own. */
const NAMED_DESIGNS = [...new Set([
  ...definitions.flatMap(definition => definition.designs ?? []),
  ...Object.values(STATIC_LAYOUT_ROUTES).flatMap((route: StaticLayoutRoute) => route.designs ?? []),
  ...OWN_DESIGN_SCHEMAS,
])].sort()

const DESIGNS = [...NAMED_DESIGNS, OTHER_STORE]

const SNAPSHOTS = fileURLToPath(new URL('../../../fixtures/builder/catalogue/', import.meta.url))

const snapshot = (design: string) => `${JSON.stringify(buildDesignCatalogue(definitions, design), null, 2)}\n`

/**
 * The section ids of the home seed: fixed, so a store's first release names
 * the same ids as every other store's. `5eed` marks them as seed ids; the last
 * four digits are the section's position on the page, from 01.
 */
const SEED_ID = /^00000000-0000-4000-8000-5eed\d{8}$/

describe('the catalogue snapshots', () => {
  it('name a schema for the other stores that no design names', () => {
    expect(NAMED_DESIGNS).not.toContain(OTHER_STORE)
    // A canary: no named design would leave one snapshot for every store.
    expect(NAMED_DESIGNS).toContain('webside')
  })

  it.each(DESIGNS)('%s is what this build serves that design', async (design) => {
    await expect(snapshot(design)).toMatchFileSnapshot(`../../../fixtures/builder/catalogue/${design}.json`)
  })

  it('are one per design, and no file is left of a design that is gone', () => {
    expect(readdirSync(SNAPSHOTS).sort()).toEqual(DESIGNS.map(design => `${design}.json`).sort())
  })
})

describe('the home seed', () => {
  it('names its sections by fixed seed ids, in page order', () => {
    expect(home.document.order).toHaveLength(Object.keys(home.document.sections).length)
    home.document.order.forEach((id, index) => {
      expect(id).toMatch(SEED_ID)
      expect(id.endsWith(String(index + 1).padStart(4, '0'))).toBe(true)
    })
  })

  describe.each(DESIGNS)('on a store of %s', (design) => {
    it('is the home template, which its catalogue lists', () => {
      expect(home.key).toBe('template:home')
      expect(buildDesignCatalogue(definitions, design).templates).toContain('home')
    })

    it('is valid against its blocks: every section survives the parse unchanged', () => {
      const registry = new Map(definitionsForDesign(definitions, design).map(block => [block.type, block]))
      const parsed = parseDocument(home.document, 'template', registry, { featureOn: () => true })

      expect(parsed.order).toEqual(home.document.order)
      expect(parsed.sections).toEqual(home.document.sections)
    })
  })
})
