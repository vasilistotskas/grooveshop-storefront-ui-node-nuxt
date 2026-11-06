import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { BUILDER_DOCUMENT_NODE_ID } from '~~/shared/constants/builder'
import {
  canDuplicateNode,
  builderNodeSiblings,
  canMoveNode,
  builderLibraryOffers,
  builderNodePosition,
  changedSections,
  duplicateNode,
  insertNode,
  moveNode,
  readBuilderWorkingCopy,
  removeNode,
  sameWorkingCopy,
  setNodeHidden,
  setNodeSetting,
  settingAt,
  upgradeDraft,
  upgradeOverlay,
} from '~/utils/builderWorkingCopy'
import type { BlockDefinition, BuilderNode } from '~~/shared/types/builder'
import type { BuilderWorkingCopy } from '~~/shared/types/builderEditor'

const item = defineBlock({ type: 'item', version: 1, kinds: ['block'], schema: z.object({ label: z.string() }) })
const list = defineBlock({
  type: 'list',
  version: 2,
  kinds: ['section'],
  schema: z.object({ title: z.string().optional() }),
  translatable: ['/title'],
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
  it('moves a section among the sections, and a block among its siblings, to the place named', () => {
    expect(moveNode(page(), 'list', 0).draft.order).toEqual(['list', 'top'])
    expect(moveNode(page(), 'a', 1).draft.sections.list!.blockOrder).toEqual(['b', 'a'])
  })

  it('names a node with its siblings, in order', () => {
    expect(builderNodeSiblings(page(), 'b')).toEqual(['a', 'b'])
    expect(builderNodeSiblings(page(), 'top')).toEqual(['top', 'list'])
    expect(builderNodeSiblings(page(), 'gone')).toBeUndefined()
  })

  it('goes nowhere past either end, nor to the place it holds, and leaves the copy as it was', () => {
    const copy = page()

    expect(canMoveNode(copy, 'top', -1)).toBe(false)
    expect(canMoveNode(copy, 'b', 2)).toBe(false)
    expect(canMoveNode(copy, 'b', 1)).toBe(false)
    expect(canMoveNode(copy, 'b', 0.5)).toBe(false)
    expect(moveNode(copy, 'top', -1)).toBe(copy)
    expect(canMoveNode(copy, 'top', 1)).toBe(true)
  })

  it('never changes the copy it was given', () => {
    const copy = page()
    const before = structuredClone(copy)

    moveNode(copy, 'list', 0)

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

describe('changing a setting', () => {
  it('sets a setting of a node, and leaves the copy it was given alone', () => {
    const copy = page()
    const next = setNodeSetting(copy, 'a', 'label', 'Άλφα')

    expect(next.draft.sections.list!.blocks!.a!.settings).toEqual({ label: 'Άλφα' })
    expect(copy.draft.sections.list!.blocks!.a!.settings).toEqual({ label: 'Α' })
  })

  it('sets a setting inside an object setting, making the object when there is none', () => {
    const next = setNodeSetting(page(), 'top', 'prompt.title', 'Γεια')

    expect(next.draft.sections.top!.settings).toEqual({ prompt: { title: 'Γεια' } })
    expect(settingAt(next.draft.sections.top!.settings, 'prompt.title')).toBe('Γεια')
  })

  it.each([['nothing', undefined], ['an empty text', ''], ['an empty list', []]])('takes a setting out for %s', (_case, value) => {
    expect(setNodeSetting(page(), 'list', 'title', value).draft.sections.list!.settings).toEqual({})
  })

  it('takes out an object setting left with no settings', () => {
    const withPrompt = setNodeSetting(page(), 'top', 'prompt.title', 'Γεια')

    expect(setNodeSetting(withPrompt, 'top', 'prompt.title', undefined).draft.sections.top!.settings).toEqual({})
  })

  it('keeps false and zero, which are values', () => {
    expect(setNodeSetting(page(), 'top', 'marquee', false).draft.sections.top!.settings).toEqual({ marquee: false })
    expect(setNodeSetting(page(), 'top', 'autoplayMs', 0).draft.sections.top!.settings).toEqual({ autoplayMs: 0 })
  })

  it('returns the copy unchanged for a node it does not hold', () => {
    const copy = page()

    expect(setNodeSetting(copy, 'gone', 'label', 'x')).toBe(copy)
  })

  it('reads nothing through a value that is not an object', () => {
    expect(settingAt({ label: 'Α' }, 'label.inner')).toBeUndefined()
    expect(settingAt({}, 'prompt.title')).toBeUndefined()
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

describe('upgradeOverlay', () => {
  const stored = {
    sections: { s: node('list@1', { heading: 'Παλιό' }, { a: node('item@1', { label: 'Α' }) }), t: node('list@1') },
    order: ['s', 't'],
  }

  it('moves each language\'s translations with its node, at every depth', () => {
    const overlay = { en: { s: { '/heading': 'Old' }, a: { '/label': 'A' } }, de: { s: { '/heading': 'Alt' } } }

    expect(upgradeOverlay(stored, overlay, blocks)).toEqual({ en: { s: { '/title': 'Old' }, a: { '/label': 'A' } }, de: { s: { '/title': 'Alt' } } })
  })

  it('keeps what belongs to no node: the document\'s own settings, and an entry the draft has no node for', () => {
    const overlay = { en: { [BUILDER_DOCUMENT_NODE_ID]: { '/seoTitle': 'Home' }, gone: { '/title': 'Gone' } } }

    expect(upgradeOverlay(stored, overlay, blocks)).toEqual(overlay)
  })

  it('takes out a node and a language left with no translation', () => {
    expect(upgradeOverlay(stored, { en: { s: { '/old': 'gone' } } }, blocks)).toEqual({})
    expect(upgradeOverlay(stored, { en: { s: { '/old': 'gone' }, a: { '/label': 'A' } } }, blocks)).toEqual({ en: { a: { '/label': 'A' } } })
  })
})

describe('readBuilderWorkingCopy', () => {
  it('opens a stored document with its overlay moved along with the upgrades of the real blocks', () => {
    const draft = { sections: { s: node('products_grid@1', { title: 'Νέα', pageSize: 6 }) }, order: ['s'] }

    const copy = readBuilderWorkingCopy('template:home', draft, { en: { s: { '/title': 'New', '/pageSize': 12 } } })

    expect(copy?.draft.sections.s?.type).toBe('products_grid@2')
    expect(copy?.i18n).toEqual({ en: { s: { '/title': 'New' } } })
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

describe('inserting a node', () => {
  it('adds a section at its place in the page', () => {
    const next = insertNode(page(), { index: 1 }, 'new', node('hero@1'))

    expect(next.draft.order).toEqual(['top', 'new', 'list'])
    expect(next.draft.sections.new).toEqual(node('hero@1'))
  })

  it('adds a block inside a section, past the end at the end', () => {
    const next = insertNode(page(), { parentId: 'list', index: 9 }, 'c', node('item@1', { label: 'Γ' }))

    expect(next.draft.sections.list!.blockOrder).toEqual(['a', 'b', 'c'])
    expect(next.draft.sections.list!.blocks!.c).toEqual(node('item@1', { label: 'Γ' }))
  })

  it('gives children to a node that had none', () => {
    const next = insertNode(page(), { parentId: 'top', index: 0 }, 'x', node('item@1'))

    expect(next.draft.sections.top).toMatchObject({ blockOrder: ['x'], blocks: { x: node('item@1') } })
  })

  it('changes nothing for a parent the copy does not hold, and never the copy it is given', () => {
    const copy = page()
    const before = structuredClone(copy)

    expect(insertNode(copy, { parentId: 'gone', index: 0 }, 'x', node('item@1'))).toBe(copy)
    insertNode(copy, { index: 0 }, 'x', node('hero@1'))
    expect(copy).toEqual(before)
  })
})

describe('what the library offers', () => {
  const preset = [{ id: 'default' }]
  const library = new Map<string, BlockDefinition>([
    defineBlock({ type: 'banner', version: 1, kinds: ['section'], schema: z.object({}), presets: preset }),
    defineBlock({ type: 'once', version: 1, kinds: ['section'], schema: z.object({}), presets: preset, limits: { maxPerTemplate: 1 } }),
    defineBlock({ type: 'loyal', version: 1, kinds: ['section'], schema: z.object({}), presets: preset, feature: 'loyalty' }),
    defineBlock({ type: 'menu', version: 1, kinds: ['section'], schema: z.object({}), presets: preset, groups: ['header'] }),
    defineBlock({ type: 'old', version: 1, kinds: ['section'], schema: z.object({}), presets: preset, deprecated: true }),
    defineBlock({ type: 'bare', version: 1, kinds: ['section'], schema: z.object({}) }),
    defineBlock({ type: 'ours', version: 1, kinds: ['section'], schema: z.object({}), presets: preset, designs: ['webside'] }),
    defineBlock({ type: 'box', version: 1, kinds: ['section'], schema: z.object({}), presets: preset, limits: { maxBlocks: 2 }, children: { allowed: ['tile'] } }),
    defineBlock({ type: 'shallow', version: 1, kinds: ['section'], schema: z.object({}), presets: preset, children: { allowed: ['tile'], maxDepth: 1 } }),
    defineBlock({ type: 'tile', version: 1, kinds: ['block'], schema: z.object({}), presets: preset, children: { allowed: ['tile'] } }),
  ].map(block => [block.type, block]))
  const copyOf = (sections: Record<string, BuilderNode>): BuilderWorkingCopy => ({ draft: { sections, order: Object.keys(sections) }, i18n: {} })
  const offers = (copy: BuilderWorkingCopy, parentId?: string, documentKey = 'template:home', off: readonly string[] = [], design = 'webside') =>
    builderLibraryOffers(copy, documentKey, { parentId }, library, feature => !off.includes(feature), design)
      .map(({ definition, refusal }) => refusal ? `${definition.type} (${refusal})` : definition.type)

  it('offers the sections that may sit in the document, never a deprecated one or one with nothing to insert', () => {
    expect(offers(copyOf({}))).toEqual(['banner', 'once', 'loyal', 'ours', 'box', 'shallow'])
    expect(offers(copyOf({}), undefined, 'group:header')).toEqual(['menu'])
  })

  it('never offers a section that exists for other designs only', () => {
    expect(offers(copyOf({}), undefined, 'template:home', [], 'webside')).toContain('ours')
    expect(offers(copyOf({}), undefined, 'template:home', [], 'demo')).not.toContain('ours')
    expect(offers(copyOf({}), undefined, 'template:home', [], 'demo')).toContain('banner')
  })

  it('shows a section whose store feature is off, refused', () => {
    expect(offers(copyOf({}), undefined, 'template:home', ['loyalty'])).toContain('loyal (feature)')
  })

  it('refuses a section the document already holds as many of as it may', () => {
    expect(offers(copyOf({ a: node('once@1') }))).toContain('once (perTemplate)')
  })

  it('offers inside a section only what it takes, and nothing once it is full', () => {
    expect(offers(copyOf({ a: node('box@1') }), 'a')).toEqual(['tile'])
    expect(offers(copyOf({ a: node('box@1', {}, { t1: node('tile@1'), t2: node('tile@1') }) }), 'a')).toEqual(['tile (full)'])
  })

  it('offers nothing below the depth a section allows, or inside a node the copy does not hold', () => {
    const nested = copyOf({ a: node('shallow@1', {}, { t1: node('tile@1') }) })

    expect(offers(nested, 'a')).toEqual(['tile'])
    expect(offers(nested, 't1')).toEqual([])
    expect(offers(nested, 'gone')).toEqual([])
  })
})

describe('where a node sits', () => {
  it('names a section by its index, and a block by its parent and index', () => {
    expect(builderNodePosition(page(), 'list')).toEqual({ index: 1 })
    expect(builderNodePosition(page(), 'b')).toEqual({ parentId: 'list', index: 1 })
    expect(builderNodePosition(page(), 'gone')).toBeUndefined()
  })
})
