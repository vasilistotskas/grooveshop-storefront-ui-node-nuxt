import { describe, expect, it, vi } from 'vitest'
import { BlockUpgradeError, formatVersionedType, parseVersionedType, upgradeNode } from '~~/shared/builder/upgrade'
import type { BuilderNode, BuilderNodeBody } from '~~/shared/types/builder'

const rename = (from: string, to: string) => vi.fn(({ settings, ...body }: BuilderNodeBody): BuilderNodeBody => {
  const { [from]: value, ...rest } = settings
  return { ...body, settings: { ...rest, [to]: value } }
})

describe('parseVersionedType', () => {
  it('splits <type>@<version>', () => {
    expect(parseVersionedType('hero_banner@12')).toEqual({ type: 'hero_banner', version: 12 })
  })

  it.each(['hero', 'hero@', '@1', 'hero@0', 'hero@01', 'hero@1.5', 'Hero@1', 'hero@1@2'])('rejects %j', (type) => {
    expect(parseVersionedType(type)).toBeUndefined()
  })

  it('round-trips with formatVersionedType', () => {
    expect(parseVersionedType(formatVersionedType('faq', 3))).toEqual({ type: 'faq', version: 3 })
  })
})

describe('upgradeNode', () => {
  const v1: BuilderNode = { type: 'promo@1', settings: { heading: 'Sale', keep: true } }

  it('returns a node that is already current as it is', () => {
    const current: BuilderNode = { type: 'promo@2', settings: { title: 'Sale' } }

    expect(upgradeNode(current, { type: 'promo', version: 2 })).toBe(current)
  })

  it('applies the step from the node\'s version and names the current version', () => {
    const step = rename('heading', 'title')

    expect(upgradeNode(v1, { type: 'promo', version: 2, upgrade: { 1: step } })).toEqual({
      type: 'promo@2',
      settings: { keep: true, title: 'Sale' },
    })
  })

  it('applies every step from the node\'s version up, in order, and no earlier one', () => {
    const calls: number[] = []
    const upgrade = {
      1: vi.fn((body: BuilderNodeBody) => (calls.push(1), body)),
      2: vi.fn((body: BuilderNodeBody) => (calls.push(2), { ...body, settings: { ...body.settings, two: true } })),
      3: vi.fn((body: BuilderNodeBody) => (calls.push(3), { ...body, settings: { ...body.settings, three: true } })),
    }

    const upgraded = upgradeNode({ type: 'promo@2', settings: {} }, { type: 'promo', version: 4, upgrade })

    expect(calls).toEqual([2, 3])
    expect(upgraded).toEqual({ type: 'promo@4', settings: { two: true, three: true } })
  })

  it('carries the rest of the node through: disabled, children and their order', () => {
    const node: BuilderNode = {
      type: 'promo@1',
      disabled: true,
      settings: { heading: 'x' },
      blocks: { a: { type: 'promo_item@1', settings: {} } },
      blockOrder: ['a'],
    }

    expect(upgradeNode(node, { type: 'promo', version: 2, upgrade: { 1: rename('heading', 'title') } })).toEqual({
      type: 'promo@2',
      disabled: true,
      settings: { title: 'x' },
      blocks: { a: { type: 'promo_item@1', settings: {} } },
      blockOrder: ['a'],
    })
  })

  it('is pure: the node it was given stays untouched when a step mutates its copy', () => {
    const node: BuilderNode = { type: 'promo@1', settings: { list: ['a'] } }
    const upgrade = {
      1: (body: BuilderNodeBody) => {
        (body.settings.list as string[]).push('b')
        return body
      },
    }

    const upgraded = upgradeNode(node, { type: 'promo', version: 2, upgrade })

    expect(node.settings.list).toEqual(['a'])
    expect(upgraded.settings.list).toEqual(['a', 'b'])
  })

  it.each([
    ['a type that is not <type>@<version>', { type: 'promo', settings: {} }, 'malformed_type'],
    ['another block', { type: 'other@1', settings: {} }, 'type_mismatch'],
    ['a version newer than the build', { type: 'promo@3', settings: {} }, 'newer_version'],
    ['a version no step reaches', { type: 'promo@1', settings: {} }, 'no_upgrade_path'],
  ] as const)('refuses %s', (_, node, code) => {
    expect(() => upgradeNode(node, { type: 'promo', version: 2 })).toThrow(expect.objectContaining({ name: 'BlockUpgradeError', code }))
  })

  it('refuses a step that returns no settings', () => {
    const upgrade = { 1: () => ({}) as BuilderNodeBody }

    expect(() => upgradeNode(v1, { type: 'promo', version: 2, upgrade })).toThrow(BlockUpgradeError)
    expect(() => upgradeNode(v1, { type: 'promo', version: 2, upgrade })).toThrow(expect.objectContaining({ code: 'invalid_result' }))
  })
})
