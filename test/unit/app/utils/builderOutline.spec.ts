import { describe, expect, it } from 'vitest'
import { builderNodeRef, builderOutline, parseBuilderNodeRef } from '~/utils/builderOutline'
import { promoBanner, promoItem } from '~~/test/fixtures/builder/blocks'
import type { BlockDefinition } from '~~/shared/types/builder'

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
