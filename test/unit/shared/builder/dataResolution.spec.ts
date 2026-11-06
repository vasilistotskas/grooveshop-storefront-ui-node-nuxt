import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { applyData, canonicalQuery, dataSites, planData } from '~~/shared/builder/data'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'
import type { BuilderDocument, BuilderNode } from '~~/shared/types/builder'
import type { DataResolution } from '~~/shared/types/builderData'

const slide = defineBlock({
  type: 'slide',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    label: z.string().optional(),
    product: builderField.ref('product', { onMissing: 'empty' }).optional(),
    spotlight: z.array(z.object({ product: builderField.ref('product', { onMissing: 'hide' }) })).optional(),
  }),
})

const rail = defineBlock({
  type: 'rail',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    products: builderField.query('product', { onEmpty: 'hide' }),
    posts: builderField.query('blogPost', { onEmpty: 'empty' }).optional(),
    top: builderField.ref('category', { onMissing: 'hide' }).optional(),
    banner: builderField.ref('media', { onMissing: 'empty' }).optional(),
  }),
  children: { allowed: ['slide'] },
  childList: { slide: 'slides' },
})

const registry = new Map([rail, slide].map(block => [block.type, block]))

const node = (type: string, settings: Record<string, unknown>, extra: Partial<BuilderNode> = {}): BuilderNode => ({ type, settings, ...extra })
const documentOf = (sections: Record<string, BuilderNode>): BuilderDocument => ({ sections, order: Object.keys(sections) })

const newest = { mode: 'filter', ordering: 'newest', limit: 4 }

const resolution = (overrides: Partial<{ [K in keyof DataResolution['records']]: DataResolution['records'][K] }> = {}, queries: Record<string, readonly unknown[] | 'failed'> = {}): DataResolution => ({
  records: { product: new Map(), blogPost: new Map(), category: new Map(), blogCategory: new Map(), media: new Map(), ...overrides },
  queries: new Map(Object.entries(queries).map(([key, items]) => [key, items === 'failed' ? items : { items, total: items.length }])),
})

describe('canonicalQuery', () => {
  it('gives equal text to equal descriptors, whatever the order of keys or of an id set', () => {
    const a = canonicalQuery('product', { mode: 'filter', categories: [3, 1, 3, 2], ordering: 'newest', limit: 4 })
    const b = canonicalQuery('product', { limit: 4, ordering: 'newest', categories: [1, 2, 3], mode: 'filter' })
    expect(a).toBe(b)
  })

  it('tells apart a different filter, ordering, limit or source', () => {
    const base = canonicalQuery('product', newest)
    expect(canonicalQuery('product', { ...newest, limit: 5 })).not.toBe(base)
    expect(canonicalQuery('product', { ...newest, ordering: 'mostViewed' })).not.toBe(base)
    expect(canonicalQuery('product', { ...newest, categories: [1] })).not.toBe(base)
    expect(canonicalQuery('blogPost', newest)).not.toBe(base)
  })
})

describe('dataSites', () => {
  const slides = {
    'slide-1': node('slide@1', { product: 7, spotlight: [{ product: 8 }, { product: 9 }] }),
    'slide-2': node('slide@1', {}, { disabled: true }),
  }
  const document = documentOf({
    home: node('rail@1', { products: { mode: 'picked', ids: [4, 2] }, top: 5 }, { blocks: slides, blockOrder: ['slide-1', 'slide-2'] }),
  })

  it('lists every data setting of the nodes the page draws with its concrete pointer', () => {
    expect(dataSites(document, registry).map(({ nodePath, pointer }) => [nodePath.join('/'), pointer])).toEqual([
      ['home', '/products'],
      ['home', '/top'],
      ['home/slide-1', '/product'],
      ['home/slide-1', '/spotlight/0/product'],
      ['home/slide-1', '/spotlight/1/product'],
    ])
  })

  it('does not read a disabled node', () => {
    const disabled = documentOf({ home: node('rail@1', { products: { mode: 'picked', ids: [1] } }, { disabled: true }) })
    expect(dataSites(disabled, registry)).toEqual([])
  })
})

describe('planData', () => {
  it('reads every id of a kind in one set, a hand-picked list and a ref together, and each distinct list once', () => {
    const document = documentOf({
      a: node('rail@1', { products: { mode: 'picked', ids: [4, 2, 4] }, top: 5 }, { blocks: { s: node('slide@1', { product: 7 }) }, blockOrder: ['s'] }),
      b: node('rail@1', { products: newest, posts: { mode: 'picked', ids: [9] } }),
      c: node('rail@1', { products: { ...newest } }),
    })

    const plan = planData(dataSites(document, registry))

    expect(plan.ids).toEqual({ product: [2, 4, 7], blogPost: [9], category: [5], blogCategory: [], media: [] })
    expect([...plan.queries.keys()]).toEqual([canonicalQuery('product', newest)])
  })
})

describe('applyData', () => {
  const run = (document: BuilderDocument, resolved: DataResolution, options?: { keepHidden?: boolean }) =>
    applyData(document, registry, resolved, options)

  it('replaces a ref by the record and a query by its items, and reports nothing', () => {
    const document = documentOf({ home: node('rail@1', { products: newest, top: 5 }) })
    const { document: out, issues } = run(document, resolution(
      { category: new Map([[5, { id: 5 }]]) },
      { [canonicalQuery('product', newest)]: [{ id: 1 }, { id: 2 }] },
    ))

    expect(out.sections.home!.settings).toEqual({
      products: { status: 'ok', items: [{ id: 1 }, { id: 2 }], total: 2, descriptor: newest },
      top: { status: 'ok', value: { id: 5 } },
    })
    expect(issues).toEqual([])
  })

  it('answers a hand-picked list in the merchant\'s order, leaving out what the store no longer serves', () => {
    const document = documentOf({ home: node('rail@1', { products: { mode: 'picked', ids: [3, 1, 2] } }) })
    const { document: out } = run(document, resolution({ product: new Map([[1, { id: 1 }], [3, { id: 3 }]]) }))

    expect(out.sections.home!.settings.products).toEqual({ status: 'ok', items: [{ id: 3 }, { id: 1 }], total: 2, descriptor: { mode: 'picked', ids: [3, 1, 2] } })
  })

  it('takes out a section whose query matched nothing when it is declared `hide`, and reports it', () => {
    const document = documentOf({ a: node('rail@1', { products: newest }), b: node('rail@1', { products: { ...newest, limit: 8 } }) })
    const { document: out, issues } = run(document, resolution({}, {
      [canonicalQuery('product', newest)]: [],
      [canonicalQuery('product', { ...newest, limit: 8 })]: [{ id: 1 }],
    }))

    expect(out.order).toEqual(['b'])
    expect(Object.keys(out.sections)).toEqual(['b'])
    expect(issues).toEqual([expect.objectContaining({ nodePath: ['a'], pointer: '/products', status: 'empty' })])
  })

  it('keeps a node declared `hide` when the editor asks to see it, and still reports it', () => {
    const document = documentOf({ a: node('rail@1', { products: newest }) })
    const { document: out, issues } = run(document, resolution({}, { [canonicalQuery('product', newest)]: [] }), { keepHidden: true })

    expect(out.order).toEqual(['a'])
    expect(out.sections.a!.settings.products).toEqual({ status: 'empty', items: [], total: 0, descriptor: newest })
    expect(issues).toHaveLength(1)
  })

  it('hands the component the status of a setting declared `empty`', () => {
    const document = documentOf({ a: node('rail@1', { products: newest, posts: { mode: 'filter', ordering: 'newest', limit: 3 } }) })
    const { document: out } = run(document, resolution({}, {
      [canonicalQuery('product', newest)]: [{ id: 1 }],
      [canonicalQuery('blogPost', { mode: 'filter', ordering: 'newest', limit: 3 })]: [],
    }))

    expect(out.order).toEqual(['a'])
    expect(out.sections.a!.settings.posts).toEqual({ status: 'empty', items: [], total: 0, descriptor: { mode: 'filter', ordering: 'newest', limit: 3 } })
  })

  it('takes a missing ref declared `hide` out of its section, and one declared `empty` leaves the block', () => {
    const document = documentOf({
      a: node('rail@1', { products: newest, top: 5 }, { blocks: { s: node('slide@1', { product: 7 }) }, blockOrder: ['s'] }),
      b: node('rail@1', { products: newest }, { blocks: { s: node('slide@1', { product: 7 }) }, blockOrder: ['s'] }),
    })
    const { document: out } = run(document, resolution({}, { [canonicalQuery('product', newest)]: [{ id: 1 }] }))

    expect(out.order).toEqual(['b'])
    expect(out.sections.b!.blocks!.s!.settings.product).toEqual({ status: 'missing' })
  })

  it('takes a list entry out when the ref inside it is declared `hide`, not the node', () => {
    const document = documentOf({
      a: node('rail@1', { products: newest }, {
        blocks: { s: node('slide@1', { label: 'x', spotlight: [{ product: 1 }, { product: 2 }, { product: 3 }] }) },
        blockOrder: ['s'],
      }),
    })
    const { document: out } = run(document, resolution(
      { product: new Map([[1, { id: 1 }], [3, { id: 3 }]]) },
      { [canonicalQuery('product', newest)]: [{ id: 1 }] },
    ))

    expect(out.sections.a!.blocks!.s!.settings.spotlight).toEqual([
      { product: { status: 'ok', value: { id: 1 } } },
      { product: { status: 'ok', value: { id: 3 } } },
    ])
  })

  it('takes a hidden child out of its parent and its block order', () => {
    const hidingSlide = defineBlock({
      type: 'tile',
      version: 1,
      kinds: ['block'],
      schema: z.object({ product: builderField.ref('product', { onMissing: 'hide' }) }),
    })
    const parent = defineBlock({ type: 'row', version: 1, kinds: ['section'], schema: z.object({}), children: { allowed: ['tile'] } })
    const document = documentOf({
      home: node('row@1', {}, { blocks: { one: node('tile@1', { product: 1 }), two: node('tile@1', { product: 2 }) }, blockOrder: ['one', 'two'] }),
    })

    const { document: out } = applyData(document, new Map([[parent.type, parent], [hidingSlide.type, hidingSlide]]), resolution({ product: new Map([[2, { id: 2 }]]) }))

    expect(Object.keys(out.sections.home!.blocks!)).toEqual(['two'])
    expect(out.sections.home!.blockOrder).toEqual(['two'])
  })

  it('answers `failed` for a read that failed, never takes the node out for it, and says so', () => {
    const document = documentOf({ home: node('rail@1', { products: newest, top: 5 }) })
    const { document: out, issues } = run(document, resolution({ category: 'failed' }, { [canonicalQuery('product', newest)]: 'failed' }))

    expect(out.order).toEqual(['home'])
    expect(out.sections.home!.settings).toEqual({ products: { status: 'failed', items: [], total: 0, descriptor: newest }, top: { status: 'failed' } })
    expect(issues.map(({ status }) => status)).toEqual(['failed', 'failed'])
  })

  it('does not touch a block without data settings', () => {
    const plain = defineBlock({ type: 'plain', version: 1, kinds: ['section'], schema: z.object({ title: z.string() }) })
    const document = documentOf({ home: node('plain@1', { title: 'x' }) })

    const { document: out } = applyData(document, new Map([[plain.type, plain]]), resolution())

    expect(out).toEqual(document)
  })
})

describe('a media ref', () => {
  const home = documentOf({
    a: node('rail@1', { products: newest, banner: 12 }),
    b: node('rail@1', { products: newest, banner: 4 }),
    c: node('rail@1', { products: newest }),
  })
  const queries = { [canonicalQuery('product', newest)]: [{ id: 1 }] }

  it('is planned with the other kinds\' ids: one sorted set of asset ids', () => {
    expect(planData(dataSites(home, registry)).ids.media).toEqual([4, 12])
  })

  it('becomes the asset the library resolved, or `missing` for one it no longer has', () => {
    const { document: out, issues } = applyData(home, registry, resolution({ media: new Map([[12, { id: 12, path: 'media/s/uploads/a.jpg' }]]) }, queries))

    expect(out.sections.a!.settings.banner).toEqual({ status: 'ok', value: { id: 12, path: 'media/s/uploads/a.jpg' } })
    expect(out.sections.b!.settings.banner).toEqual({ status: 'missing' })
    expect(issues).toEqual([expect.objectContaining({ nodePath: ['b'], pointer: '/banner', status: 'missing' })])
  })

  it('is `failed`, never an absence, when the read of the library failed', () => {
    const { document: out } = applyData(home, registry, resolution({ media: 'failed' }, queries))

    expect(out.sections.a!.settings.banner).toEqual({ status: 'failed' })
  })
})
