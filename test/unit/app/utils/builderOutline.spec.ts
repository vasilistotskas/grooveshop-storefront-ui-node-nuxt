import { describe, expect, it } from 'vitest'
import { builderNodeRef, builderOutline, builderOutlineDrag, builderOutlineDropIndex, builderProblemNodeId, findBuilderNode, parseBuilderNodeRef } from '~/utils/builderOutline'
import { promoBanner, promoItem } from '~~/test/fixtures/builder/blocks'
import type { BlockDefinition } from '~~/shared/types/builder'
import type { BuilderOutlineNode } from '~/utils/builderOutline'

const blocks = new Map<string, BlockDefinition>([[promoBanner.type, promoBanner], [promoItem.type, promoItem]])

describe('builderOutline', () => {
  it('lists the sections in their order, each with its blocks in theirs', () => {
    const outline = builderOutline('template:home', {
      sections: {
        b: { type: 'promo_banner@2', settings: {} },
        a: {
          type: 'promo_banner@2',
          settings: {},
          blocks: { x: { type: 'promo_item@1', settings: { label: 'X' } }, y: { type: 'promo_item@1', settings: { label: 'Y' } } },
          blockOrder: ['y', 'x'],
        },
      },
      order: ['a', 'b'],
    }, blocks)

    expect(outline.map(node => node.nodeId)).toEqual(['a', 'b'])
    expect(outline[0]!.children.map(node => node.nodeId)).toEqual(['y', 'x'])
    expect(outline[0]!.children[0]).toMatchObject({ ref: 'template:home/y', documentKey: 'template:home', blockType: 'promo_item' })
  })

  it('names a node by the first of its block\'s title settings that has text', () => {
    const [node] = builderOutline('group:footer', {
      sections: { s: { type: 'promo_banner@2', settings: {}, blocks: { i: { type: 'promo_item@1', settings: { label: '  Νέες αφίξεις ' } } }, blockOrder: ['i'] } },
      order: ['s'],
    }, blocks)

    expect(node!.children[0]!.title).toBe('Νέες αφίξεις')
  })

  it.each([['blank text', { label: '  ' }], ['no title setting set', {}]])('leaves the title out for %s', (_case, settings) => {
    const [node] = builderOutline('page:about', {
      sections: { s: { type: 'promo_banner@2', settings: {}, blocks: { i: { type: 'promo_item@1', settings } }, blockOrder: ['i'] } },
      order: ['s'],
    }, blocks)

    expect(node!.children[0]).not.toHaveProperty('title')
  })

  it('keeps a node of a block this build does not define, by its type name, untitled', () => {
    const [node] = builderOutline('page:about', { sections: { s: { type: 'gone@3', settings: { label: 'x' } } }, order: ['s'] }, blocks)

    expect(node).toMatchObject({ blockType: 'gone', hidden: false, children: [] })
    expect(node).not.toHaveProperty('title')
  })

  it('marks a node hidden from shoppers', () => {
    const [node] = builderOutline('page:about', { sections: { s: { type: 'promo_banner@2', disabled: true, settings: {} } }, order: ['s'] }, blocks)

    expect(node!.hidden).toBe(true)
  })
})

describe('node references', () => {
  it('round-trip a document key and a node id', () => {
    expect(parseBuilderNodeRef(builderNodeRef('group:header', 'menu_1'))).toEqual({ documentKey: 'group:header', nodeId: 'menu_1' })
  })

  it.each(['hero_1', 'template:home/', 'nope/hero_1', 'template:home/hero 1', ''])('refuse %j', (ref) => {
    expect(parseBuilderNodeRef(ref)).toBeUndefined()
  })
})

describe('findBuilderNode', () => {
  it('finds a node at any depth, and nothing for an id the document does not hold', () => {
    const inner = { type: 'promo_item@1', settings: { label: 'X' } }
    const draft = { sections: { s: { type: 'promo_banner@2', settings: {}, blocks: { i: inner }, blockOrder: ['i'] } }, order: ['s'] }

    expect(findBuilderNode(draft, 'i')).toBe(inner)
    expect(findBuilderNode(draft, 's')).toBe(draft.sections.s)
    expect(findBuilderNode(draft, 'nope')).toBeUndefined()
  })
})

describe('builderProblemNodeId', () => {
  it.each([
    ['/sections/hero/settings/title', 'hero'],
    ['/sections/hero/blocks/slide_2/settings/heading', 'slide_2'],
    ['/sections/hero/type', 'hero'],
    ['/i18n/en/slide_2/~1heading', 'slide_2'],
    ['/order', undefined],
    ['', undefined],
  ])('names the node of %j', (path, nodeId) => {
    expect(builderProblemNodeId(path)).toBe(nodeId)
  })
})

describe('dragging a row of the outline', () => {
  const row = (ref: string, children: BuilderOutlineNode[] = []): BuilderOutlineNode =>
    ({ ref, documentKey: 'template:home', nodeId: ref, blockType: 'x', hidden: false, children })
  // Two sections of blocks, the second's first block holding one of its own.
  const rows = [row('one', [row('a'), row('b')]), row('two', [row('c', [row('c1')]), row('d')])]

  it('drops a section beside the sections only, with every block folded away', () => {
    const drag = builderOutlineDrag(rows, 'two')!

    expect(drag.siblings).toEqual(['one', 'two'])
    expect([...drag.folded]).toEqual(['a', 'b', 'c', 'c1', 'd'])
  })

  it('drops a block beside its own siblings only, with theirs folded away', () => {
    const drag = builderOutlineDrag(rows, 'd')!

    expect(drag.siblings).toEqual(['c', 'd'])
    expect([...drag.folded]).toEqual(['c1'])
  })

  it('has nothing to drag for a row the outline does not have', () => {
    expect(builderOutlineDrag(rows, 'gone')).toBeUndefined()
  })

  it('lands among its siblings by the order the drop left the rows in, the rows of other nodes aside', () => {
    const drag = builderOutlineDrag(rows, 'two')!

    expect(builderOutlineDropIndex(drag, 'two', ['two', 'one', 'a', 'b', 'c', 'c1', 'd'])).toBe(0)
    expect(builderOutlineDropIndex(drag, 'two', ['one', 'a', 'b', 'two', 'c', 'c1', 'd'])).toBe(1)
  })
})
