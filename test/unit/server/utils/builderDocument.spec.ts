import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { parseDocument } from '~~/server/utils/builderDocument'
import type { BuilderNode } from '~~/shared/types/builder'
import { promoBanner, promoItem } from '~~/test/fixtures/builder/blocks'
import { log } from '~~/test/helpers/nitro'

const registry = new Map([promoBanner, promoItem].map(block => [block.type, block]))

const item = (label: string, extra: Partial<BuilderNode> = {}): BuilderNode => ({ type: 'promo_item@1', settings: { label }, ...extra })
const banner = (extra: Partial<BuilderNode> = {}): BuilderNode => ({ type: 'promo_banner@2', settings: { title: 'Sale' }, ...extra })

const parse = (sections: Record<string, unknown>, order = Object.keys(sections)) => parseDocument({ sections, order }, registry)
const skipped = () => log.warn.mock.calls.flatMap(([event]) =>
  typeof event === 'object' && event !== null && 'message' in event && event.message === 'node skipped' ? [event] : [])

describe('parseDocument', () => {
  describe('a good document', () => {
    it('keeps its sections in order, with the defaults of the schema applied', () => {
      const document = parse({ a: banner(), b: banner({ settings: { title: 'Two', tone: 'accent' } }) }, ['b', 'a'])

      expect(document).toEqual({
        order: ['b', 'a'],
        sections: {
          a: { type: 'promo_banner@2', settings: { title: 'Sale', tone: 'info' } },
          b: { type: 'promo_banner@2', settings: { title: 'Two', tone: 'accent' } },
        },
      })
      expect(skipped()).toEqual([])
    })

    it('keeps the blocks of a section in their order, and a disabled flag', () => {
      const document = parse({
        a: banner({ disabled: true, blocks: { x: item('X'), y: item('Y') }, blockOrder: ['y', 'x'] }),
      })

      expect(document.sections.a).toEqual({
        type: 'promo_banner@2',
        disabled: true,
        settings: { title: 'Sale', tone: 'info' },
        blocks: { x: item('X'), y: item('Y') },
        blockOrder: ['y', 'x'],
      })
    })

    it('keeps the order of ids that look like numbers, which an object would sort', () => {
      const document = parse({ 2: banner(), 10: banner(), 1: banner() }, ['10', '2', '1'])

      expect(document.order).toEqual(['10', '2', '1'])
    })

    it('omits the children of a node that has none left', () => {
      expect(parse({ a: banner({ blocks: {}, blockOrder: [] }) }).sections.a).not.toHaveProperty('blocks')
    })
  })

  describe('upgrade and strip', () => {
    it('brings a node of an older version to the current one before it checks it', () => {
      const document = parse({ a: { type: 'promo_banner@1', settings: { heading: 'Old' } } })

      expect(document.sections.a).toEqual({ type: 'promo_banner@2', settings: { title: 'Old', tone: 'info' } })
    })

    it('strips a setting the schema does not know, at every level', () => {
      const document = parse({
        a: banner({
          settings: { title: 'Sale', onclick: 'steal()', note: { text: 'n', style: 'x' } },
          blocks: { x: item('X', { settings: { label: 'X', class: 'evil' } }) },
          blockOrder: ['x'],
        }),
      })

      expect(document.sections.a!.settings).toEqual({ title: 'Sale', tone: 'info', note: { text: 'n' } })
      expect(document.sections.a!.blocks!.x!.settings).toEqual({ label: 'X' })
    })

    it('keeps only the keys of a node: nothing else rides along', () => {
      const document = parse({ a: { ...banner(), props: { evil: true }, extra: 1 } })

      expect(Object.keys(document.sections.a!)).toEqual(['type', 'settings'])
    })
  })

  describe('a node that cannot be used', () => {
    it('is left out with a warning, and the rest of the page stays', () => {
      const document = parse({
        good: banner(),
        invalid: banner({ settings: { title: 123 } }),
        unknown: { type: 'nope@1', settings: {} },
        malformed: { type: 'promo_banner', settings: {} },
        newer: { type: 'promo_banner@3', settings: { title: 'x' } },
        notAnObject: 'a string',
        missing: undefined,
      })

      expect(document.order).toEqual(['good'])
      expect(Object.keys(document.sections)).toEqual(['good'])
      expect(skipped()).toEqual([
        expect.objectContaining({ node: 'invalid', reason: 'invalid_settings', detail: expect.stringContaining('title') }),
        expect.objectContaining({ node: 'unknown', reason: 'unknown_type' }),
        expect.objectContaining({ node: 'malformed', reason: 'malformed_type' }),
        expect.objectContaining({ node: 'newer', reason: 'newer_version' }),
        expect.objectContaining({ node: 'notAnObject', reason: 'invalid_node' }),
        expect.objectContaining({ node: 'missing', reason: 'invalid_node' }),
      ])
    })

    it('takes its children with it', () => {
      const document = parse({ a: banner({ settings: { title: 1 }, blocks: { x: item('X') }, blockOrder: ['x'] }), b: banner() })

      expect(document.order).toEqual(['b'])
      expect(skipped()).toHaveLength(1)
    })

    it('drops a bad block and keeps its siblings', () => {
      const document = parse({
        a: banner({ blocks: { x: item('X'), y: { type: 'promo_item@1', settings: { label: 5 } }, z: item('Z') }, blockOrder: ['x', 'y', 'z'] }),
      })

      expect(document.sections.a!.blockOrder).toEqual(['x', 'z'])
      expect(Object.keys(document.sections.a!.blocks!)).toEqual(['x', 'z'])
      expect(skipped()).toEqual([expect.objectContaining({ node: 'a/y', reason: 'invalid_settings' })])
    })

    it('is left out when an upgrade cannot run, whether it is missing or throws', () => {
      const throwing = defineBlock({
        type: 'fragile',
        version: 2,
        kinds: ['section'],
        schema: z.object({}),
        upgrade: { 1: () => { throw new Error('bad data') } },
      })
      const document = parseDocument({
        sections: { a: { type: 'fragile@1', settings: {} }, b: { type: 'fragile@2', settings: {} } },
        order: ['a', 'b'],
      }, new Map([[throwing.type, throwing]]))

      expect(document.order).toEqual(['b'])
      expect(skipped()).toEqual([expect.objectContaining({ node: 'a', reason: 'upgrade_failed', detail: 'bad data' })])
    })

    it('is left out for an id that is not an id', () => {
      const document = parse({ 'has space': banner(), 'ok_id-1': banner() })

      expect(document.order).toEqual(['ok_id-1'])
      expect(skipped()).toEqual([expect.objectContaining({ node: 'has space', reason: 'invalid_id' })])
    })
  })

  describe('where a node may sit', () => {
    it('refuses a block as a section, and a section as a block', () => {
      const document = parse({
        a: item('X'),
        b: banner({ blocks: { x: banner() }, blockOrder: ['x'] }),
      })

      expect(Object.keys(document.sections)).toEqual(['b'])
      expect(document.sections.b).not.toHaveProperty('blocks')
      expect(skipped()).toEqual([
        expect.objectContaining({ node: 'a', reason: 'wrong_kind' }),
        expect.objectContaining({ node: 'b/x', reason: 'wrong_kind' }),
      ])
    })

    it('refuses a block the parent does not allow', () => {
      const lone = defineBlock({ type: 'lone', version: 1, kinds: ['block'], schema: z.object({}) })
      const document = parseDocument({
        sections: { a: banner({ blocks: { x: { type: 'lone@1', settings: {} } }, blockOrder: ['x'] }) },
        order: ['a'],
      }, new Map([promoBanner, promoItem, lone].map(block => [block.type, block])))

      expect(document.sections.a).not.toHaveProperty('blocks')
      expect(skipped()).toEqual([expect.objectContaining({ node: 'a/x', reason: 'not_allowed' })])
    })

    it('stops nesting at three levels, and at the depth a block allows', () => {
      const group = defineBlock({ type: 'group', version: 1, kinds: ['section', 'block'], schema: z.object({}), children: { allowed: ['group'] } })
      const levels = (depth: number): BuilderNode => ({
        type: 'group@1',
        settings: {},
        ...(depth > 1 && { blocks: { c: levels(depth - 1) }, blockOrder: ['c'] }),
      })
      const document = parseDocument({ sections: { a: levels(5) }, order: ['a'] }, new Map([[group.type, group]]))
      const depth = (node: BuilderNode | undefined): number => node ? 1 + depth(node.blocks?.c) : 0

      expect(depth(document.sections.a)).toBe(3)
      expect(skipped()).toEqual([expect.objectContaining({ node: 'a/c/c/c', reason: 'not_allowed' })])
    })

    it('honours children.maxDepth of the section', () => {
      // promo_banner allows one level of children, so a block inside its block is cut.
      const nesting = defineBlock({ type: 'nesting', version: 1, kinds: ['block'], schema: z.object({}), children: { allowed: ['nesting'] } })
      const flat = defineBlock({ ...promoBanner, children: { allowed: ['nesting'], maxDepth: 1 } })
      const document = parseDocument({
        sections: {
          a: {
            type: 'promo_banner@2',
            settings: { title: 'x' },
            blocks: { n: { type: 'nesting@1', settings: {}, blocks: { m: { type: 'nesting@1', settings: {} } }, blockOrder: ['m'] } },
            blockOrder: ['n'],
          },
        },
        order: ['a'],
      }, new Map([[flat.type, flat], [nesting.type, nesting]]))

      expect(document.sections.a!.blocks!.n).not.toHaveProperty('blocks')
      expect(skipped()).toEqual([expect.objectContaining({ node: 'a/n/m', reason: 'not_allowed' })])
    })
  })

  describe('what the order names', () => {
    it('renders only the sections and blocks it lists, once each, and ignores ids that name nothing', () => {
      const document = parse({
        a: banner({ blocks: { x: item('X'), orphan: item('O') }, blockOrder: ['x', 'x', 'ghost'] }),
        unlisted: banner(),
      }, ['a', 'a'])

      expect(document.order).toEqual(['a'])
      expect(document.sections.a!.blockOrder).toEqual(['x'])
      expect(skipped()).toEqual([expect.objectContaining({ node: 'a/ghost', reason: 'invalid_node' })])
    })
  })

  describe('a document that is not one', () => {
    it.each([null, undefined, 'x', 42, [], {}, { sections: {} }, { order: [] }, { sections: [], order: [] }])('is an empty document for %j', (raw) => {
      expect(parseDocument(raw, registry)).toEqual({ sections: {}, order: [] })
      expect(skipped()).toHaveLength(1)
    })
  })

  it('reads the blocks of this build when given no registry', () => {
    const document = parseDocument({ sections: { a: banner() }, order: ['a'] })

    expect(document.order).toEqual(['a'])
  })
})
