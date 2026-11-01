import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import type { BlockConfig, BlockUpgrade } from '~~/shared/types/builder'

const schema = z.object({ title: z.string(), items: z.array(z.string()).optional() })

const define = (overrides: Partial<BlockConfig> = {}) => defineBlock({
  type: 'banner',
  version: 1,
  kinds: ['section'],
  schema,
  ...overrides,
})

describe('defineBlock', () => {
  it('fills in the defaults of everything a block may leave out', () => {
    const block = define()

    expect(block).toMatchObject({
      type: 'banner',
      version: 1,
      translatable: [],
      refs: {},
      limits: {},
      children: { allowed: [] },
      childList: {},
    })
    expect(block.schema).toBe(schema)
  })

  it('keeps what a block declares', () => {
    const block = define({
      kinds: ['section', 'block'],
      translatable: ['/title'],
      refs: { '/items': 'product' },
      limits: { maxBlocks: 6, maxPerTemplate: 2 },
      children: { allowed: ['slide'], maxDepth: 1 },
      childList: { slide: 'slides' },
      groups: ['marketing'],
      templates: ['home'],
      feature: 'loyalty',
      deprecated: true,
    })

    expect(block).toMatchObject({
      kinds: ['section', 'block'],
      translatable: ['/title'],
      refs: { '/items': 'product' },
      limits: { maxBlocks: 6, maxPerTemplate: 2 },
      children: { allowed: ['slide'], maxDepth: 1 },
      groups: ['marketing'],
      templates: ['home'],
      feature: 'loyalty',
      deprecated: true,
      childList: { slide: 'slides' },
    })
  })

  it.each(['Banner', '1banner', 'hero-banner', 'banner@1', ''])('refuses the type %j', (type) => {
    expect(() => define({ type })).toThrow(/lower snake case/)
  })

  it.each([0, -1, 1.5, Number.NaN])('refuses the version %s', (version) => {
    expect(() => define({ version })).toThrow(/integer of 1 or more/)
  })

  it('refuses a repeated kind', () => {
    expect(() => define({ kinds: ['section', 'section'] })).toThrow(/distinct/)
  })

  describe('pointers', () => {
    it('accept a nested pointer whose first segment is a setting', () => {
      expect(() => define({ translatable: ['/items/0'] })).not.toThrow()
    })

    it('refuse a translatable pointer that names no setting', () => {
      expect(() => define({ translatable: ['/missing'] })).toThrow(/\/missing names no setting/)
    })

    it('refuse a ref pointer that names no setting', () => {
      expect(() => define({ refs: { '/missing': 'product' } })).toThrow(/\/missing names no setting/)
    })
  })

  describe('upgrade', () => {
    const step: BlockUpgrade = body => body

    it('takes consecutive steps ending at the step to the current version', () => {
      expect(() => define({ version: 3, upgrade: { 1: step, 2: step } })).not.toThrow()
      expect(() => define({ version: 3, upgrade: { 2: step } })).not.toThrow()
    })

    it('refuses a gap, a step to nowhere and a step that stops short', () => {
      expect(() => define({ version: 4, upgrade: { 1: step, 3: step } })).toThrow(/consecutive/)
      expect(() => define({ version: 2, upgrade: { 2: step } })).toThrow(/consecutive versions below 2/)
      expect(() => define({ version: 3, upgrade: { 1: step } })).toThrow(/must end with 2/)
    })
  })

  it.each([0, 3, 1.5])('refuses children.maxDepth %s: the document nests three levels', (maxDepth) => {
    expect(() => define({ children: { allowed: [], maxDepth } })).toThrow(/maxDepth/)
  })

  describe('childList', () => {
    const blocks = { children: { allowed: ['slide', 'badge'] } }

    it('names the list prop each allowed child feeds', () => {
      expect(define({ ...blocks, childList: { slide: 'slides', badge: 'badges' } }).childList).toEqual({ slide: 'slides', badge: 'badges' })
    })

    it('refuses a child that is not allowed', () => {
      expect(() => define({ ...blocks, childList: { other: 'others' } })).toThrow(/"other", which is not an allowed child/)
    })

    it('refuses a prop that is not a camelCase name', () => {
      expect(() => define({ ...blocks, childList: { slide: 'Slides' } })).toThrow(/camelCase/)
    })

    it('refuses a prop that two children share or a setting already uses', () => {
      expect(() => define({ ...blocks, childList: { slide: 'items', badge: 'items' } })).toThrow(/distinct/)
      expect(() => define({ ...blocks, childList: { slide: 'items' }, schema: z.object({ items: z.string() }) })).toThrow(/not a setting/)
    })
  })

  it('refuses a repeated preset id', () => {
    expect(() => define({ presets: [{ id: 'a' }, { id: 'a' }] })).toThrow(/preset ids/)
  })

  it('names the block in every refusal', () => {
    expect(() => define({ version: 0 })).toThrow(/^defineBlock\(banner\): /)
  })
})
