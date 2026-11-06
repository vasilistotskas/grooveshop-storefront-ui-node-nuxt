import { describe, expect, it } from 'vitest'
import { parseVersionedType, upgradeNode } from '~~/shared/builder/upgrade'
import { builderTranslatedSettings, upgradeNodeTranslations } from '~/utils/builderTranslation'
import { settingAt } from '~/utils/builderWorkingCopy'
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
  /** A language's translations of `before`, and what they are of `after`. */
  translations?: Record<string, unknown>
  translationsAfter?: Record<string, unknown>
}

const upgradeCases = cases as UpgradeCase[]

const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/**/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(module => module.default)
const definitionOf = (node: BuilderNode) => definitions.find(({ type }) => type === parseVersionedType(node.type)?.type)!

describe('upgrade-cases.json', () => {
  it('has a case for every block that can be upgraded', () => {
    const covered = new Set(cases.map(({ before }) => parseVersionedType(before.type)?.type))
    const upgradable = definitions.filter(({ upgrade }) => upgrade).map(({ type }) => type)

    expect(upgradable.filter(type => !covered.has(type))).toEqual([])
  })

  it.each(upgradeCases)('$name', ({ before, after }) => {
    expect(upgradeNode(before, definitionOf(before))).toStrictEqual(after)
  })

  const translated = upgradeCases.filter(({ translations }) => translations)

  it.each(translated)('moves the translations: $name', ({ before, translations, translationsAfter }) => {
    expect(upgradeNodeTranslations(before, definitionOf(before), translations!)).toEqual(translationsAfter)
  })

  // Why the move is right: a language reads the same text before the upgrade
  // (Django merges the overlay, the storefront upgrades) as after it (the
  // stored node is upgraded, Django merges the moved overlay).
  it.each(translated)('leaves a language reading what it read: $name', ({ before, translations }) => {
    const definition = definitionOf(before)
    const read = upgradeNode({ ...before, settings: builderTranslatedSettings(before.settings, translations) }, definition)
    const upgraded = upgradeNode(before, definition)
    const moved = upgradeNodeTranslations(before, definition, translations!)

    for (const pointer of definition.translatable) {
      const path = pointer.slice(1).split('/').join('.')
      expect(settingAt(builderTranslatedSettings(upgraded.settings, moved), path), pointer).toEqual(settingAt(read.settings, path))
    }
  })
})
