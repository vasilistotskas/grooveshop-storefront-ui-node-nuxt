import { describe, expect, it } from 'vitest'
import { parseVersionedType, upgradeNode } from '~~/shared/builder/upgrade'
import type { BlockDefinition, BuilderNode } from '~~/shared/types/builder'
import cases from '~~/test/fixtures/builder/upgrade-cases.json'

/**
 * The shared vectors of the block upgrades: `test/fixtures/builder/upgrade-cases.json`
 * is vendored by Django like `placement-cases.json`. Django writes these
 * upgrades into the stored documents, so its port is held to the same cases,
 * and this side proves each one against the block as it is declared. One node
 * at a time: `upgradeNode` leaves a node's own children to the walk over the
 * document, which is why a case's child stays as it was.
 */
interface UpgradeCase {
  name: string
  before: BuilderNode
  after: BuilderNode
}

const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/**/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(module => module.default)
const definitionOf = (node: BuilderNode) => definitions.find(({ type }) => type === parseVersionedType(node.type)?.type)!

describe('upgrade-cases.json', () => {
  it('has a case for every block that can be upgraded', () => {
    const covered = new Set(cases.map(({ before }) => parseVersionedType(before.type)?.type))
    const upgradable = definitions.filter(({ upgrade }) => upgrade).map(({ type }) => type)

    expect(upgradable.filter(type => !covered.has(type))).toEqual([])
  })

  it.each(cases as UpgradeCase[])('$name', ({ before, after }) => {
    expect(upgradeNode(before, definitionOf(before))).toEqual(after)
  })
})
