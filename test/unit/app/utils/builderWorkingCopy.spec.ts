import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import {
  canDuplicateNode,
  canMoveNode,
  changedSections,
  duplicateNode,
  moveNode,
  removeNode,
  sameWorkingCopy,
  setNodeHidden,
  upgradeDraft,
} from '~/utils/builderWorkingCopy'
import type { BlockDefinition, BuilderNode } from '~~/shared/types/builder'
import type { BuilderWorkingCopy } from '~~/shared/types/builderEditor'

const item = defineBlock({ type: 'item', version: 1, kinds: ['block'], schema: z.object({ label: z.string() }) })
const list = defineBlock({
  type: 'list',
  version: 2,
  kinds: ['section'],
  schema: z.object({ title: z.string().optional() }),
  limits: { maxBlocks: 3 },
  children: { allowed: ['item'] },
  upgrade: { 1: body => ({ ...body, settings: { title: String(body.settings.heading ?? '') } }) },
})
const hero = defineBlock({ type: 'hero', version: 1, kinds: ['section'], schema: z.object({}), limits: { maxPerTemplate: 1 } })
const blocks = new Map<string, BlockDefinition>([item, list, hero].map(block => [block.type, block]))

const node = (type: string, settings: Record<string, unknown> = {}, children?: Record<string, BuilderNode>): BuilderNode => ({
  type,
  settings,
  ...(children && { blocks: children, blockOrder: Object.keys(children) }),
})

/** A page: a hero, then a list of two items, with Greek-to-English translations of the list and its first item. */
const page = (): BuilderWorkingCopy => ({
  draft: {
    sections: {
      top: node('hero@1'),
      list: node('list@2', { title: 'Λίστα' }, { a: node('item@1', { label: 'Α' }), b: node('item@1', { label: 'Β' }) }),
    },
    order: ['top', 'list'],
  },
  i18n: { en: { list: { '/title': 'List' }, a: { '/label': 'A' } } },
})

describe('moving a node', () => {
  it('moves a section among the sections, and a block among its siblings', () => {
    expect(moveNode(page(), 'list', -1).draft.order).toEqual(['list', 'top'])
    expect(moveNode(page(), 'a', 1).draft.sections.list!.blockOrder).toEqual(['b', 'a'])
  })

  it('goes no further than either end, and leaves the copy as it was', () => {
    const copy = page()

    expect(canMoveNode(copy, 'top', -1)).toBe(false)
    expect(canMoveNode(copy, 'b', 1)).toBe(false)
    expect(moveNode(copy, 'top', -1)).toBe(copy)
    expect(canMoveNode(copy, 'top', 1)).toBe(true)
  })

  it('never changes the copy it was given', () => {
    const copy = page()
    const before = structuredClone(copy)

    moveNode(copy, 'list', -1)

    expect(copy).toEqual(before)
  })
})

describe('hiding a node', () => {
  it('marks it hidden, and shows it again without leaving the flag behind', () => {
    const hidden = setNodeHidden(page(), 'a', true)

    expect(hidden.draft.sections.list!.blocks!.a!.disabled).toBe(true)
    expect(setNodeHidden(hidden, 'a', false).draft.sections.list!.blocks!.a).not.toHaveProperty('disabled')
  })
})

describe('removing a node', () => {
  it('takes a section out with the blocks inside it and every translation of them', () => {
    const copy = removeNode(page(), 'list')

    expect(copy.draft).toEqual({ sections: { top: node('hero@1') }, order: ['top'] })
    expect(copy.i18n).toEqual({ en: {} })
  })

  it('takes a block out of its section, and the section\'s child lists with the last one', () => {
    const once = removeNode(page(), 'a')
    expect(once.draft.sections.list!.blockOrder).toEqual(['b'])
    expect(once.i18n.en).toEqual({ list: { '/title': 'List' } })

    expect(removeNode(once, 'b').draft.sections.list).toEqual(node('list@2', { title: 'Λίστα' }))
  })
})

describe('duplicating a node', () => {
  const ids = () => {
    let next = 0
    return () => `new${++next}`
  }

  it('puts the copy right after the node, under fresh ids, with its blocks and their translations', () => {
    const { copy, nodeId } = duplicateNode(page(), 'list', ids())

    expect(nodeId).toBe('new1')
    expect(copy.draft.order).toEqual(['top', 'list', 'new1'])
    expect(copy.draft.sections.new1).toEqual(node('list@2', { title: 'Λίστα' }, { new2: node('item@1', { label: 'Α' }), new3: node('item@1', { label: 'Β' }) }))
    expect(copy.i18n.en).toEqual({ list: { '/title': 'List' }, a: { '/label': 'A' }, new1: { '/title': 'List' }, new2: { '/label': 'A' } })
  })

  it('copies a block inside its own section', () => {
    const { copy } = duplicateNode(page(), 'b', ids())

    expect(copy.draft.sections.list!.blockOrder).toEqual(['a', 'b', 'new1'])
  })

  it('is refused where the parent holds its most blocks, or the page its most of a type', () => {
    const full = duplicateNode(page(), 'a', ids()).copy

    expect(canDuplicateNode(page(), 'a', blocks)).toBe(true)
    expect(canDuplicateNode(full, 'a', blocks)).toBe(false)
    expect(canDuplicateNode(page(), 'top', blocks)).toBe(false)
    expect(canDuplicateNode(page(), 'list', blocks)).toBe(true)
  })
})

describe('upgradeDraft', () => {
  it('brings every node to its block\'s current version', () => {
    const draft = { sections: { s: node('list@1', { heading: 'Old' }, { a: node('item@1', { label: 'A' }) }) }, order: ['s'] }

    expect(upgradeDraft(draft, blocks)?.sections.s).toEqual(node('list@2', { title: 'Old' }, { a: node('item@1', { label: 'A' }) }))
  })

  it.each([
    ['a type this build does not define', node('gone@1')],
    ['a newer version', node('hero@2')],
    ['a block below it it cannot read', node('list@2', {}, { x: node('gone@1') })],
  ])('cannot open a draft with %s', (_case, section) => {
    expect(upgradeDraft({ sections: { s: section }, order: ['s'] }, blocks)).toBeUndefined()
  })
})

describe('changedSections', () => {
  it('names the sections changed, added or removed, including through a translation', () => {
    const mine = page()
    const theirs = structuredClone(mine)
    theirs.draft.sections.list!.blocks!.b!.settings.label = 'Άλλο'
    theirs.i18n.en!.top = { '/x': 'y' }
    theirs.draft.sections.extra = node('hero@1')
    theirs.draft.order.push('extra')

    expect(changedSections(mine, theirs)).toEqual(['top', 'list', 'extra'])
    expect(changedSections(mine, structuredClone(mine))).toEqual([])
  })
})

describe('sameWorkingCopy', () => {
  it('tells an unchanged copy from a changed one', () => {
    expect(sameWorkingCopy(page(), page())).toBe(true)
    expect(sameWorkingCopy(page(), setNodeHidden(page(), 'top', true))).toBe(false)
  })
})
