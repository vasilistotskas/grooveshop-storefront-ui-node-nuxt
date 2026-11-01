import { describe, expect, it } from 'vitest'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import { parseDocument } from '~~/server/utils/builderDocument'
import { sectionProps } from '~~/server/utils/builderProps'
import { parseSectionProps } from '~~/server/utils/pageSectionProps'
import type { BlockDefinition, BuilderNode } from '~~/shared/types/builder'
import type { ComponentTypeEnum } from '~~/shared/openapi/types.gen'
import golden from '~~/test/fixtures/builder/legacy-sections.json'

/**
 * The port of page_config's sections to builder blocks changes no render.
 *
 * Every golden case is a legacy section and the node it becomes. The legacy
 * section's props, parsed as today's page-config route parses them, are what
 * its component receives now; the node, parsed as the builder route will
 * and turned back into props, must give the component exactly the same.
 * Equal props to one component is an equal render. The same file is
 * Django's test of its data migration (`legacy` in, `node` out).
 *
 * Reads the REAL blocks of `app/blocks` (every file there), not the unit project's fixture set.
 * Vitest caches this file's transform, glob included: after ADDING a block file locally,
 * edit this comment once or the new block is not seen (CI starts clean).
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const registry = new Map(definitions.map(block => [block.type, block]))

/** What DRF's camel-case renderer does to a stored body: every key, at every depth. */
function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeKeys)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [
    key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase()),
    camelizeKeys(inner),
  ]))
}

interface Case {
  name: string
  type: string
  legacy: { title: string, props: Record<string, unknown> }
  node: BuilderNode
}
const cases = golden.cases as Case[]

/**
 * The props the section component gets from page_config today (`Renderer.vue`):
 * the title, then the parsed props. The title is only carried over for a block
 * with a `title` setting, which is exactly the blocks whose component reads it:
 * on the others it was passed and never used, so a legacy title there is dropped
 * by the port and no render changes.
 */
function legacyProps({ type, legacy }: Case): Record<string, unknown> {
  const { props } = parseSectionProps(type as ComponentTypeEnum, camelizeKeys(legacy.props))
  const title = registry.get(type)!.schema.shape.title ? legacy.title || undefined : undefined
  return JSON.parse(JSON.stringify({ title, ...props }))
}

function builderProps({ node }: Case): Record<string, unknown> {
  const document = parseDocument({ sections: { s1: node }, order: ['s1'] }, 'page', registry)
  expect(document.order, 'the node parses').toEqual(['s1'])
  return JSON.parse(JSON.stringify(sectionProps(document.sections.s1!, registry)))
}

describe('the real blocks', () => {
  it('make a consistent catalogue', () => {
    const { blocks } = buildBlockCatalogue(definitions)

    expect(blocks.map(block => block.type)).toEqual(definitions.map(block => block.type).sort())
  })

  it('mark rich text so Django sanitises it on save', () => {
    const richText = buildBlockCatalogue(definitions).blocks.find(block => block.type === 'rich_text')!

    expect(richText.schema).toMatchObject({ properties: { content: { contentMediaType: 'text/html' } } })
  })

  it('state the rule that a trust badge needs a logo or an icon, for Django and for the parse alike', () => {
    const badge = buildBlockCatalogue(definitions).blocks.find(block => block.type === 'trust_badge')!
    const bare = { type: 'trust_badges@1', settings: {}, blocks: { a: { type: 'trust_badge@1', settings: { kind: 'custom', label: 'Bare' } } }, blockOrder: ['a'] }

    expect(badge.schema.anyOf).toEqual([{ required: ['imageUrl'] }, { required: ['icon'] }])
    expect(parseDocument({ sections: { s1: bare }, order: ['s1'] }, 'page', registry).sections.s1).not.toHaveProperty('blocks')
  })

  it('are all version 1, closed, with every translatable pointer a setting', () => {
    for (const block of buildBlockCatalogue(definitions).blocks) {
      expect(block.version, block.type).toBe(1)
      expect(block.schema.additionalProperties, block.type).toBe(false)
    }
  })
})

describe('porting a legacy section to a block', () => {
  it.each(cases.map(testCase => [testCase.name, testCase] as const))('%s: the component gets the same props', (_, testCase) => {
    expect(builderProps(testCase)).toEqual(legacyProps(testCase))
  })

  it('has a block definition for every ported type, and a case for every block that is a section', () => {
    const covered = new Set(cases.map(({ type }) => type))
    const sections = definitions.filter(block => block.kinds.includes('section')).map(block => block.type)

    expect(sections.filter(type => !covered.has(type))).toEqual([])
    expect(cases.filter(({ type }) => !registry.has(type)).map(({ type }) => type)).toEqual([])
  })

  it('writes every child block id as b<position>, for Django to compare by position', () => {
    for (const { node } of cases) {
      expect(Object.keys(node.blocks ?? {})).toEqual((node.blockOrder ?? []).map((_, i) => `b${i + 1}`))
    }
  })

  it('writes a node Django could store: its settings are valid and the schema strips none of them', () => {
    const check = (node: BuilderNode, name: string) => {
      const parsed = registry.get(node.type.split('@')[0]!)!.schema.safeParse(node.settings)
      expect(parsed.success, name).toBe(true)
      expect(parsed.data, name).toEqual(node.settings)
      Object.values(node.blocks ?? {}).forEach(child => check(child, name))
    }
    for (const { node, name } of cases) check(node, name)
  })
})
