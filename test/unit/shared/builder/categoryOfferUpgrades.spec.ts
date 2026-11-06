import { describe, expect, it } from 'vitest'
import { upgradeNode } from '~~/shared/builder/upgrade'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * Version 1 of the categories band kept what it lists in `parentId` and
 * `limit`, the offers band in `limit`; version 2 keeps one descriptor. The
 * pages already written must draw what they drew.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/**/*.block.ts', { eager: true })
const block = (type: string) => Object.values(modules).map(module => module.default).find(definition => definition.type === type)!

const upgraded = (type: string, settings: Record<string, unknown>) => {
  const definition = block(type)
  const node = upgradeNode({ type: `${type}@1`, settings }, definition)
  return { node, parsed: definition.schema.safeParse(node.settings) }
}

describe('product_categories, version 1 to 2', () => {
  it('lists the main categories, as many as the band drew when it named none', () => {
    const { node, parsed } = upgraded('product_categories', { heading: 'Κατηγορίες', layout: 'grid' })

    expect(node.type).toBe('product_categories@2')
    expect(node.settings).toEqual({ heading: 'Κατηγορίες', layout: 'grid', categories: { mode: 'roots', limit: 8 } })
    expect(parsed.success).toBe(true)
  })

  it('lists the children of the category it named, as many as it asked for', () => {
    const { node, parsed } = upgraded('product_categories', { parentId: 4, limit: 12 })

    expect(node.settings).toEqual({ categories: { mode: 'children', parent: 4, limit: 12 } })
    expect(parsed.success).toBe(true)
  })
})

describe('offers_preview, from version 1', () => {
  it('keeps the words of the band, which a store may translate, and lists three when it named no size', () => {
    const { node, parsed } = upgraded('offers_preview', { title: 'Τίτλος', eyebrow: 'Προσφορές', surface: 'muted' })

    expect(node.type).toBe('offers_preview@3')
    expect(node.settings).toEqual({ heading: 'Τίτλος', eyebrow: 'Προσφορές', surface: 'muted', offers: { limit: 3 } })
    expect(parsed.success).toBe(true)
  })

  it('lists as many as the band asked for', () => {
    const { node } = upgraded('offers_preview', { limit: 5 })

    expect(node.settings).toEqual({ offers: { limit: 5 } })
  })
})
