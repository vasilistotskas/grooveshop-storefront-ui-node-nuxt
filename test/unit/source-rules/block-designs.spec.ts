import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { BlockDefinition } from '~~/shared/types/builder'
import { APP } from '../../helpers/sourceText'

/**
 * A block that has a presentation in one design only is declared so (`designs`),
 * and the rule runs both ways against the component registry
 * (`app/utils/componentRegistry.ts`, which keys a design's variant
 * `<type>@<design>`):
 *
 * - a section that names `designs` has a `<type>@<design>` entry for each of
 *   them and NO base entry (a base entry would draw it in every design); a
 *   block inside a section is drawn by its parent, not by the registry;
 * - a section that has no base entry (and is no menu group, which the chrome
 *   draws) names `designs`: otherwise every store's catalogue offers a section
 *   most of them cannot draw, and Django accepts it.
 *
 * A child of a design-only section exists for the designs of its parent, or
 * the parent's catalogue would allow a block it does not list.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const byType = new Map(definitions.map(block => [block.type, block]))

const registry = readFileSync(resolve(APP, 'utils/componentRegistry.ts'), 'utf-8')
const keys = [...registry.matchAll(/^\s*'([a-z_]+)(?:@([A-Za-z_]\w*))?':/gm)].map(([, type, design]) => ({ type: type!, design }))
const hasBase = (type: string) => keys.some(key => key.type === type && key.design === undefined)
const hasVariant = (type: string, design: string) => keys.some(key => key.type === type && key.design === design)

const designOnly = definitions.filter(block => block.designs)

describe('block designs', () => {
  // A canary: reading nothing would pass every case.
  it('reads the blocks and the registry', () => {
    expect(definitions.length).toBeGreaterThanOrEqual(40)
    expect(keys.length).toBeGreaterThanOrEqual(40)
    expect(designOnly.length).toBeGreaterThanOrEqual(8)
  })

  const designOnlySections = designOnly.filter(block => block.kinds.includes('section'))

  it.each(designOnlySections.map(block => [block.type, block.designs!] as const))('%s is drawn by a variant of each design it names, and by no base component', (type, designs) => {
    expect(hasBase(type)).toBe(false)
    expect(designs.filter(design => !hasVariant(type, design))).toEqual([])
  })

  it('names the designs of every section that only a design draws', () => {
    const undeclared = definitions
      .filter(block => block.kinds.includes('section') && !block.groups && !block.designs && !hasBase(block.type))
      .map(block => block.type)

    expect(undeclared).toEqual([])
  })

  it('has every child of a design-only section exist for each design of its parent', () => {
    const wrong = designOnly.flatMap(parent => parent.children.allowed.flatMap((type) => {
      const child = byType.get(type)
      if (child?.designs === undefined) return [`${type} (child of ${parent.type}) names no designs`]
      return parent.designs!.filter(design => !child.designs!.includes(design)).map(design => `${type} lacks ${design} (child of ${parent.type})`)
    }))

    expect(wrong).toEqual([])
  })
})
