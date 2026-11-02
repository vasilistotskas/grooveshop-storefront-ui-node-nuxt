import { describe, expect, it } from 'vitest'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import { parseDocument } from '~~/shared/builder/document'
import type { BlockDefinition } from '~~/shared/types/builder'
import home from '~~/test/fixtures/builder/seeds/home.json'

/**
 * What Django's seeds are tested against, committed so it cannot rot.
 *
 * Two things under `test/fixtures/builder/`, both copied into Django, pinned
 * (its `sync_storefront_sources.py`):
 *
 * - `catalogue.json`: the catalogue payload of this build for the default
 *   schema (`GET /api/builder/catalogue`, which is the same for every store
 *   today), pretty-printed. A block or a document-root change fails the spec
 *   until the file is regenerated with
 *   `pnpm vitest run --project=unit test/unit/server/utils/builderSeeds.spec.ts -u`
 *   and reviewed in the diff.
 * - `seeds/*.json`: the documents a new store starts with, as `{key, document,
 *   i18n}`. They are data, edited by hand and reviewed in the diff; a new store
 *   gets them as its first release. Django seeds them without a catalogue, so
 *   this is where they are held to the real blocks.
 *
 * Reads the REAL blocks of `app/blocks`. Vitest caches this file's transform,
 * globs included: after ADDING a block file locally, edit this comment once or
 * it is not seen (CI starts clean).
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const registry = new Map(definitions.map(block => [block.type, block]))

/**
 * The section ids of the home seed: fixed, so a store's first release names
 * the same ids as every other store's. `5eed` marks them as seed ids; the last
 * four digits are the section's position on the page, from 01.
 */
const SEED_ID = /^00000000-0000-4000-8000-5eed\d{8}$/

describe('the catalogue snapshot', () => {
  it('is what this build generates', async () => {
    await expect(`${JSON.stringify(buildBlockCatalogue(definitions), null, 2)}\n`)
      .toMatchFileSnapshot('../../../fixtures/builder/catalogue.json')
  })
})

describe('the home seed', () => {
  it('is the home template, which the catalogue lists', () => {
    expect(home.key).toBe('template:home')
    expect(buildBlockCatalogue(definitions).templates).toContain('home')
  })

  it('names its sections by fixed seed ids, in page order', () => {
    expect(home.document.order).toHaveLength(Object.keys(home.document.sections).length)
    home.document.order.forEach((id, index) => {
      expect(id).toMatch(SEED_ID)
      expect(id.endsWith(String(index + 1).padStart(4, '0'))).toBe(true)
    })
  })

  it('is valid against the catalogue it is snapshotted beside: every section survives the parse unchanged', () => {
    const parsed = parseDocument(home.document, 'template', registry, { featureOn: () => true })

    expect(parsed.order).toEqual(home.document.order)
    expect(parsed.sections).toEqual(home.document.sections)
  })
})
