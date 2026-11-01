import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { sectionProps } from '~~/server/utils/builderProps'
import type { BuilderNode } from '~~/shared/types/builder'
import { promoBanner, promoItem } from '~~/test/fixtures/builder/blocks'

const registry = new Map([promoBanner, promoItem].map(block => [block.type, block]))
const item = (label: string, extra: Partial<BuilderNode> = {}): BuilderNode => ({ type: 'promo_item@1', settings: { label }, ...extra })
const banner = (extra: Partial<BuilderNode> = {}): BuilderNode => ({ type: 'promo_banner@2', settings: { title: 'Sale' }, ...extra })

describe('sectionProps', () => {
  it('is the settings of a node with no children', () => {
    expect(sectionProps(banner(), registry)).toEqual({ title: 'Sale' })
  })

  it('puts the children under the list prop the block names, in order', () => {
    const node = banner({ blocks: { a: item('A'), b: item('B') }, blockOrder: ['b', 'a'] })

    expect(sectionProps(node, registry)).toEqual({ title: 'Sale', items: [{ label: 'B' }, { label: 'A' }] })
  })

  it('leaves out a disabled child, and a child whose type feeds no list', () => {
    const node = banner({
      blocks: { a: item('A', { disabled: true }), b: item('B'), c: { type: 'unlisted@1', settings: {} } },
      blockOrder: ['a', 'b', 'c'],
    })

    expect(sectionProps(node, registry)).toEqual({ title: 'Sale', items: [{ label: 'B' }] })
  })

  it('has no list prop at all for a block with no children', () => {
    expect(sectionProps(banner({ blocks: {}, blockOrder: [] }), registry)).not.toHaveProperty('items')
  })

  it('reads the children of children, each by its own block\'s list', () => {
    const row = defineBlock({ type: 'row', version: 1, kinds: ['block'], schema: z.object({ text: z.string() }) })
    const card = defineBlock({ type: 'card', version: 1, kinds: ['block'], schema: z.object({}), children: { allowed: ['row'] }, childList: { row: 'rows' } })
    const list = defineBlock({ type: 'list', version: 1, kinds: ['section'], schema: z.object({}), children: { allowed: ['card'] }, childList: { card: 'cards' } })
    const node: BuilderNode = {
      type: 'list@1',
      settings: {},
      blocks: { c: { type: 'card@1', settings: {}, blocks: { r: { type: 'row@1', settings: { text: 'x' } } }, blockOrder: ['r'] } },
      blockOrder: ['c'],
    }

    expect(sectionProps(node, new Map([row, card, list].map(block => [block.type, block])))).toEqual({ cards: [{ rows: [{ text: 'x' }] }] })
  })
})
