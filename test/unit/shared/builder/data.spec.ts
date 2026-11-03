import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { BLOG_POST_ORDERINGS, DATA_LIMITS, DATA_SCHEMA_MARKER, PRODUCT_ORDERINGS } from '~~/shared/constants/builder'
import { dataPointers } from '~~/shared/builder/dataPointers'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'
import { blockSettingsJsonSchema } from '~~/shared/builder/jsonSchema'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'

const products = builderField.query('product', { onEmpty: 'hide' })

describe('builderField.query', () => {
  it.each([
    { mode: 'picked', ids: [3, 1, 2] },
    { mode: 'filter', ordering: 'newest', limit: 8 },
    { mode: 'filter', categories: [1, 2], ordering: 'priceDesc', limit: DATA_LIMITS.maxQueryLimit },
  ])('accepts the product descriptor %j', (value) => {
    expect(products.safeParse(value).success).toBe(true)
  })

  it.each([
    ['an unknown filter', { mode: 'filter', ordering: 'newest', limit: 8, price: 3 }],
    ['an unknown ordering', { mode: 'filter', ordering: 'featured', limit: 8 }],
    ['no limit', { mode: 'filter', ordering: 'newest' }],
    ['a limit over the cap', { mode: 'filter', ordering: 'newest', limit: DATA_LIMITS.maxQueryLimit + 1 }],
    ['a zero limit', { mode: 'filter', ordering: 'newest', limit: 0 }],
    ['an empty id list', { mode: 'picked', ids: [] }],
    ['too many picked ids', { mode: 'picked', ids: Array.from({ length: DATA_LIMITS.maxPickedIds + 1 }, (_, i) => i + 1) }],
    ['too many filter ids', { mode: 'filter', categories: [1, 2, 3, 4, 5, 6], ordering: 'newest', limit: 4 }],
    ['an ordering with picked ids', { mode: 'picked', ids: [1], ordering: 'newest' }],
    ['a string id', { mode: 'picked', ids: ['1'] }],
    ['no mode', { ordering: 'newest', limit: 4 }],
    ['a bare id list', [1, 2]],
  ])('refuses %s', (_, value) => {
    expect(products.safeParse(value).success).toBe(false)
  })

  it('names the orderings the product list can sort by, and the two of the blog', () => {
    expect(PRODUCT_ORDERINGS).toEqual(['newest', 'mostViewed', 'mostLiked', 'topRated', 'discounted', 'priceAsc', 'priceDesc'])
    expect(BLOG_POST_ORDERINGS).toEqual(['newest', 'mostViewed'])
  })

  it('narrows the limit to the maxLimit of the field', () => {
    const rail = builderField.query('product', { onEmpty: 'empty', maxLimit: 6 })
    expect(rail.safeParse({ mode: 'filter', ordering: 'newest', limit: 6 }).success).toBe(true)
    expect(rail.safeParse({ mode: 'filter', ordering: 'newest', limit: 7 }).success).toBe(false)
  })

  it.each([0, 1.5, DATA_LIMITS.maxQueryLimit + 1])('refuses the maxLimit %s', (maxLimit) => {
    expect(() => builderField.query('product', { onEmpty: 'hide', maxLimit })).toThrow(/maxLimit/)
  })

  it('describes the other sources', () => {
    const posts = builderField.query('blogPost', { onEmpty: 'hide' })
    expect(posts.safeParse({ mode: 'filter', category: 2, featured: true, ordering: 'mostViewed', limit: 3 }).success).toBe(true)
    expect(posts.safeParse({ mode: 'filter', categories: [2], ordering: 'newest', limit: 3 }).success).toBe(false)
    const categories = builderField.query('category', { onEmpty: 'hide' })
    expect(categories.safeParse({ mode: 'roots', limit: 8 }).success).toBe(true)
    expect(categories.safeParse({ mode: 'children', parent: 4, limit: 24 }).success).toBe(true)
    expect(categories.safeParse({ mode: 'children', limit: 24 }).success).toBe(false)
    expect(builderField.query('blogCategory', { onEmpty: 'hide' }).safeParse({ limit: 10 }).success).toBe(true)
    expect(builderField.query('promotion', { onEmpty: 'hide' }).safeParse({ limit: 3, code: 'X' }).success).toBe(false)
  })
})

describe('builderField.ref', () => {
  it('stores a numeric id, or a key for a page', () => {
    expect(builderField.ref('product', { onMissing: 'empty' }).safeParse(7).success).toBe(true)
    expect(builderField.ref('product', { onMissing: 'empty' }).safeParse('7').success).toBe(false)
    expect(builderField.ref('product', { onMissing: 'empty' }).safeParse(0).success).toBe(false)
    expect(builderField.ref('page', { onMissing: 'hide' }).safeParse('about').success).toBe(true)
    expect(builderField.ref('page', { onMissing: 'hide' }).safeParse(3).success).toBe(false)
    expect(builderField.ref('media', { onMissing: 'empty' }).safeParse(3).success).toBe(true)
  })

  it('refuses a kind that is not a record', () => {
    expect(() => builderField.ref('order' as never, { onMissing: 'hide' })).toThrow(/not a record kind/)
  })
})

describe('dataPointers', () => {
  const schema = z.object({
    title: builderField.text(20).optional(),
    products,
    chip: builderField.ref('product', { onMissing: 'empty' }).optional(),
    nested: z.object({ posts: builderField.query('blogPost', { onEmpty: 'empty' }).optional() }).optional(),
    slides: z.array(z.object({ product: builderField.ref('product', { onMissing: 'empty' }) })).optional(),
  })

  it('lists every data setting by pointer with its declaration, whatever its depth', () => {
    expect(dataPointers(schema)).toEqual({
      '/products': { field: 'query', source: 'product', onEmpty: 'hide', maxLimit: DATA_LIMITS.maxQueryLimit },
      '/chip': { field: 'ref', kind: 'product', onMissing: 'empty' },
      '/nested/posts': { field: 'query', source: 'blogPost', onEmpty: 'empty', maxLimit: DATA_LIMITS.maxQueryLimit },
      '/slides/*/product': { field: 'ref', kind: 'product', onMissing: 'empty' },
    })
  })

  it('states the declaration in the JSON Schema of the settings, where Django reads it', () => {
    const json = blockSettingsJsonSchema(schema) as { properties: Record<string, Record<string, unknown>> }
    expect(json.properties.chip![DATA_SCHEMA_MARKER]).toEqual({ field: 'ref', kind: 'product', onMissing: 'empty' })
    expect(json.properties.products![DATA_SCHEMA_MARKER]).toMatchObject({ field: 'query', source: 'product' })
  })

  it('finds none in a schema without any', () => {
    expect(dataPointers(z.object({ title: z.string() }))).toEqual({})
  })
})

describe('defineBlock with data settings', () => {
  const define = (overrides: Record<string, unknown> = {}) => defineBlock({
    type: 'rail',
    version: 1,
    kinds: ['section'],
    schema: z.object({ heading: builderField.text(40).optional(), products }),
    ...overrides,
  })

  it('derives `data` from the schema', () => {
    expect(define().data).toEqual({ '/products': expect.objectContaining({ field: 'query', source: 'product' }) })
    expect(defineBlock({ type: 'plain', version: 1, kinds: ['section'], schema: z.object({}) }).data).toEqual({})
  })

  it('refuses a setting that is both data and in refs', () => {
    expect(() => define({ refs: { '/products': 'product' } })).toThrow(/both a data setting and in refs/)
  })

  it('refuses a translatable data setting', () => {
    expect(() => define({ translatable: ['/products'] })).toThrow(/same in every language/)
  })
})

describe('the catalogue', () => {
  const rail = defineBlock({
    type: 'rail',
    version: 1,
    kinds: ['section'],
    schema: z.object({ heading: builderField.text(40).optional(), products }),
  })
  const plain = defineBlock({ type: 'plain', version: 1, kinds: ['section'], schema: z.object({ title: z.string() }) })

  it('states `data` for a block that has data settings', () => {
    const block = buildBlockCatalogue([rail], {}, []).blocks[0]!
    expect(block.data).toEqual({ '/products': { field: 'query', source: 'product', onEmpty: 'hide', maxLimit: DATA_LIMITS.maxQueryLimit } })
  })

  it('leaves `data` out of a block without any, so the catalogue is unchanged until a block uses it', () => {
    const block = buildBlockCatalogue([plain], {}, []).blocks[0]!
    expect(block).not.toHaveProperty('data')
  })
})
