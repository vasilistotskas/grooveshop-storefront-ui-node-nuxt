import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderBlocks, builderCatalogueDocument, buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import { promoBanner, promoItem } from '~~/test/fixtures/builder/blocks'

const blockOf = (type: string) => buildBlockCatalogue([promoBanner, promoItem]).blocks.find(block => block.type === type)!

describe('buildBlockCatalogue', () => {
  it('states each block the way the contract with Django does', () => {
    expect(blockOf('promo_banner')).toEqual({
      type: 'promo_banner',
      version: 2,
      accepts: [2],
      schema: expect.objectContaining({ type: 'object' }),
      translatable: ['/title', '/note/text'],
      refs: { '/productId': 'product' },
      limits: { maxPerTemplate: 3 },
      children: { allowed: ['promo_item'], maxDepth: 1 },
      kinds: ['section'],
      groups: ['marketing'],
      templates: ['home'],
    })
  })

  it('leaves out what a block does not set: groups, templates, feature, deprecated, maxDepth', () => {
    expect(blockOf('promo_item')).toEqual({
      type: 'promo_item',
      version: 1,
      accepts: [1],
      schema: expect.any(Object),
      translatable: ['/label'],
      refs: {},
      limits: { maxBlocks: 4 },
      children: { allowed: [] },
      kinds: ['block'],
    })
  })

  it('marks a deprecated block and carries its feature gate', () => {
    const old = defineBlock({ type: 'old', version: 1, kinds: ['section'], schema: z.object({}), deprecated: true, feature: 'loyalty' })

    expect(buildBlockCatalogue([old]).blocks[0]).toMatchObject({ deprecated: true, feature: 'loyalty' })
  })

  describe('the settings schema', () => {
    const { schema } = blockOf('promo_banner') as { schema: Record<string, any> }

    it('is JSON Schema of draft 2020-12', () => {
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    })

    it('is closed at every level: an unknown key is refused', () => {
      expect(schema.additionalProperties).toBe(false)
      expect(schema.properties.note.additionalProperties).toBe(false)
    })

    it('describes what is saved: a field with a default may be absent', () => {
      expect(schema.required).toEqual(['title'])
      expect(schema.properties.tone).toMatchObject({ enum: ['info', 'accent'], default: 'info' })
    })

    it('carries the rules of the fields', () => {
      expect(schema.properties.title).toMatchObject({ type: 'string', maxLength: 80 })
      expect(schema.properties.productId).toMatchObject({ type: 'integer' })
      expect(blockOf('promo_item').schema).toMatchObject({
        properties: { href: { type: 'string', pattern: '^(\\/|https:\\/\\/)' } },
      })
    })

    it('leaves a free-form map as it is', () => {
      const free = defineBlock({ type: 'free', version: 1, kinds: ['section'], schema: z.object({ extra: z.record(z.string(), z.string()) }) })

      expect(buildBlockCatalogue([free]).blocks[0]!.schema).toMatchObject({
        properties: { extra: { type: 'object', additionalProperties: { type: 'string' } } },
      })
    })

    it('refuses a setting JSON Schema cannot state, instead of publishing a gap', () => {
      const bad = defineBlock({ type: 'bad', version: 1, kinds: ['section'], schema: z.object({ when: z.date() }) })

      expect(() => buildBlockCatalogue([bad])).toThrow(/date/i)
    })
  })

  describe('the hash', () => {
    it('is 16 hex digits and stays the same for the same blocks, whatever their order', () => {
      const one = buildBlockCatalogue([promoBanner, promoItem])
      const other = buildBlockCatalogue([promoItem, promoBanner])

      expect(one.hash).toMatch(/^[0-9a-f]{16}$/)
      expect(other).toEqual(one)
    })

    it('changes when a block does', () => {
      const changed = defineBlock({ ...promoItem, schema: z.object({ label: z.string().max(41) }) })

      expect(buildBlockCatalogue([promoBanner, changed]).hash).not.toBe(buildBlockCatalogue([promoBanner, promoItem]).hash)
    })

    it('is that of an empty catalogue when no block is defined', () => {
      expect(buildBlockCatalogue([])).toEqual({ hash: expect.stringMatching(/^[0-9a-f]{16}$/), blocks: [], documentKinds: expect.any(Object) })
    })

    it('changes when what a document carries at its root does', () => {
      const roots = { page: { schema: z.object({ seoTitle: z.string().max(71).optional() }), translatable: ['/seoTitle'] as const } }

      expect(buildBlockCatalogue([], roots).hash).not.toBe(buildBlockCatalogue([]).hash)
    })
  })

  describe('documentKinds', () => {
    const { documentKinds } = buildBlockCatalogue([])

    it('states the root settings of a page and a template: their SEO copy, all translatable, limits as the model sets them', () => {
      expect(Object.keys(documentKinds)).toEqual(['page', 'template'])
      expect(documentKinds.page).toEqual({
        schema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            seoTitle: { type: 'string', maxLength: 70 },
            seoDescription: { type: 'string', maxLength: 300 },
            seoKeywords: { type: 'string', maxLength: 255 },
          },
          additionalProperties: false,
        },
        translatable: ['/seoTitle', '/seoDescription', '/seoKeywords'],
      })
      expect(documentKinds.template).toEqual(documentKinds.page)
    })

    it('lists no kind that has no root settings: the theme and a group', () => {
      expect(documentKinds).not.toHaveProperty('theme')
      expect(documentKinds).not.toHaveProperty('group')
    })
  })

  describe('a contradictory set', () => {
    it('is refused when a type is defined twice', () => {
      expect(() => buildBlockCatalogue([promoItem, promoItem])).toThrow(/"promo_item" is defined twice/)
    })

    it('is refused when a child type is missing', () => {
      expect(() => buildBlockCatalogue([promoBanner])).toThrow(/allows "promo_item" inside it/)
    })

    it('is refused when a child type is a section only', () => {
      const sectionOnly = defineBlock({ ...promoItem, kinds: ['section'] })

      expect(() => buildBlockCatalogue([promoBanner, sectionOnly])).toThrow(/not a defined block of kind "block"/)
    })
  })
})

describe('this build\'s catalogue', () => {
  it('registers the blocks of the build by type', () => {
    expect([...builderBlocks.keys()]).toEqual(['promo_banner', 'promo_item'])
  })

  it('serves the catalogue as JSON with its hash', () => {
    const { hash, json } = builderCatalogueDocument

    const { blocks, documentKinds } = buildBlockCatalogue([promoBanner, promoItem])

    expect(JSON.parse(json)).toEqual({ hash, blocks, documentKinds })
  })
})
