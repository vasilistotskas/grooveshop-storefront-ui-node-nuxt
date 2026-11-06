import { describe, expect, it } from 'vitest'
import { upgradeNode } from '~~/shared/builder/upgrade'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * Version 1 of the product rails kept what they list in `ordering`,
 * `categoryId`, `pageSize` (and `columns`); since version 2 it is one
 * descriptor, and since version 3 one `heading`.
 * The pages already written must draw what they drew: the upgrade is that
 * promise, run on every read and on every load of the editor.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/**/*.block.ts', { eager: true })
const block = (type: string) => Object.values(modules).map(module => module.default).find(definition => definition.type === type)!

const upgraded = (type: string, settings: Record<string, unknown>) => {
  const definition = block(type)
  const node = upgradeNode({ type: `${type}@1`, settings }, definition)
  return { node, parsed: definition.schema.safeParse(node.settings) }
}

describe.each(['products_slider', 'products_grid', 'featured_products'])('%s, from version 1', (type) => {
  it('turns the ordering, category and size of a rail into the descriptor of what it lists', () => {
    const { node, parsed } = upgraded(type, { ordering: 'popular', categoryId: 4, pageSize: 6, heading: 'Για σένα', showAddToCart: false })

    expect(node.type).toBe(`${type}@3`)
    expect(node.settings).toEqual({
      heading: 'Για σένα',
      showAddToCart: false,
      products: { mode: 'filter', categories: [4], ordering: 'mostLiked', limit: 6 },
    })
    expect(parsed.success).toBe(true)
  })

  it.each([
    ['featured', 'mostViewed'],
    ['newest', 'newest'],
    ['popular', 'mostLiked'],
    ['discounted', 'discounted'],
    ['rating', 'topRated'],
  ])('renames the %s ordering to %s, which says what it sorts by', (legacy, current) => {
    const { node } = upgraded(type, { ordering: legacy })

    expect((node.settings.products as { ordering: string }).ordering).toBe(current)
  })

  it('keeps the words of the band, which a store may translate, under one heading', () => {
    const { node } = upgraded(type, { title: 'Τίτλος', heading: 'Επικεφαλίδα', subheading: 'Υπότιτλος', ctaText: 'Όλα', ctaLink: { route: '/offers' }, surface: 'muted' })

    expect(node.settings).toMatchObject({ heading: 'Επικεφαλίδα', subheading: 'Υπότιτλος', ctaText: 'Όλα', ctaLink: { route: '/offers' }, surface: 'muted' })
    expect(node.settings).not.toHaveProperty('title')
  })

  it('leaves out what version 1 left out, with the ordering and size the component drew', () => {
    const { node, parsed } = upgraded(type, {})
    const expectedOrdering = type === 'products_slider' ? 'newest' : 'mostViewed'

    expect(node.settings).toEqual({ products: { mode: 'filter', ordering: expectedOrdering, limit: 8 } })
    expect(parsed.success).toBe(true)
  })

  it('cuts a size above what a list may carry, and drops the columns that never changed what was drawn', () => {
    const { node, parsed } = upgraded(type, { pageSize: 48, columns: 4 })

    expect(node.settings).toEqual({ products: expect.objectContaining({ limit: 24 }) })
    expect(node.settings).not.toHaveProperty('columns')
    expect(parsed.success).toBe(true)
  })

  it('does not touch the node it was given', () => {
    const settings = { ordering: 'featured', pageSize: 8 }
    upgraded(type, settings)

    expect(settings).toEqual({ ordering: 'featured', pageSize: 8 })
  })
})
