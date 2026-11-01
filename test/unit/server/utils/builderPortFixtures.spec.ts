import { describe, expect, it } from 'vitest'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import { parseDocument } from '~~/server/utils/builderDocument'
import { sectionProps } from '~~/server/utils/builderProps'
import { parseSectionProps } from '~~/test/helpers/legacyPageSectionProps'
import { BUILDER_DOCUMENT_ROOTS } from '~~/shared/builder/documentRoots'
import { convertLegacyLayout } from '~~/shared/builder/fromLegacy'
import type { BuilderOverlay, LegacyError, LegacyLayout, LegacyWarning } from '~~/shared/builder/fromLegacy'
import { convertLegacyMenu } from '~~/shared/builder/fromLegacyMenu'
import type { LegacyMenu } from '~~/shared/builder/fromLegacyMenu'
import type { BlockDefinition, BuilderDocument, BuilderDocumentKind, BuilderNode } from '~~/shared/types/builder'
import type { ComponentTypeEnum } from '~~/shared/openapi/types.gen'

/**
 * The port of page_config's sections to builder blocks changes no render.
 *
 * Every fixture (`test/fixtures/builder/legacy/*.json`) is a request to
 * `POST /api/builder/convert-legacy`, a legacy layout as Django stores it,
 * and the response it must get. Django's importer replays the same files.
 *
 * Two independent checks stand behind them. The converter must give the
 * recorded response (the node of each fixture is written by hand, not by
 * the converter). And the props the legacy section gives its component today
 * (parsed as the page-config route parses them) must equal what the converted
 * node gives it back through `sectionProps`: equal props to one component is
 * an equal render.
 *
 * Reads the REAL blocks of `app/blocks`, not the unit project's fixture set.
 * Vitest caches this file's transform, globs included: after ADDING a block
 * or a fixture file locally, edit this comment once or it is not seen (CI
 * starts clean).
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const registry = new Map(definitions.map(block => [block.type, block]))

type Request = { schema: string, key: string, defaultLocale: string } & (
  | { kind: Exclude<BuilderDocumentKind, 'group' | 'theme'>, legacy: LegacyLayout }
  | { kind: 'group', legacy: LegacyMenu }
)

interface Fixture {
  request: Request
  /** The 200 body, or for a layout the converter refuses the 422 body. */
  response: { document: BuilderDocument, i18n: BuilderOverlay, warnings: LegacyWarning[] } | { code: 'unconvertible', errors: LegacyError[] }
}
const files = import.meta.glob<{ default: Fixture }>('../../../fixtures/builder/legacy/*.json', { eager: true })
const all = Object.entries(files).map(([path, { default: fixture }]) => ({ name: path.split('/').pop()!.replace('.json', ''), ...fixture }))

type Converted = Extract<Fixture['response'], { document: unknown }>
const refused = all.flatMap(fixture => 'code' in fixture.response ? [{ ...fixture, response: fixture.response }] : [])
/** The fixtures the converter answers 200 to. */
const fixtures = all.flatMap(fixture => 'document' in fixture.response ? [{ ...fixture, response: fixture.response as Converted }] : [])

/** What DRF's camel-case renderer does to a stored body: every key, at every depth. */
function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeKeys)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [
    key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase()),
    camelizeKeys(inner),
  ]))
}

const convert = ({ request }: Pick<Fixture, 'request'>) => request.kind === 'group'
  ? convertLegacyMenu(request.legacy, { defaultLocale: request.defaultLocale, registry })
  : convertLegacyLayout(request.legacy, { kind: request.kind, defaultLocale: request.defaultLocale, registry, roots: BUILDER_DOCUMENT_ROOTS })

/** Every layout fixture's sections: the ones whose component props can be compared with the legacy section's. */
const layouts = fixtures.flatMap(fixture => fixture.request.kind === 'group' ? [] : [{ ...fixture, request: fixture.request }])

/**
 * The props the section component gets from page_config today (`Renderer.vue`):
 * the title, then the parsed props. The title is only carried over for a block
 * with a `title` setting, which is exactly the blocks whose component reads it:
 * on the others it was passed and never used, so a legacy title there is dropped
 * by the port and no render changes. The same goes for a prop with no setting.
 */
function legacyProps({ type, title, props }: { type: string, title: string, props: Record<string, unknown> }): Record<string, unknown> {
  const definition = registry.get(type)!
  const ported = new Set([...Object.keys(definition.schema.shape), ...Object.values(definition.childList)])
  const parsed = parseSectionProps(type as ComponentTypeEnum, camelizeKeys(props)).props
  // A prop no component reads has no setting (the converter warns `dropped_setting`).
  const read = Object.fromEntries(Object.entries(parsed).filter(([key]) => ported.has(key)))
  const kept = definition.schema.shape.title ? title || undefined : undefined
  return JSON.parse(JSON.stringify({ title: kept, ...read }))
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

  it('are all version 1 and closed', () => {
    for (const block of buildBlockCatalogue(definitions).blocks) {
      expect(block.version, block.type).toBe(1)
      expect(block.schema.additionalProperties, block.type).toBe(false)
    }
  })
})

describe('converting a legacy layout', () => {
  it.each(fixtures.map(fixture => [fixture.name, fixture] as const))('%s: gives the recorded response', (_, fixture) => {
    expect(convert(fixture)).toEqual(fixture.response)
  })

  it.each(refused.map(fixture => [fixture.name, fixture] as const))('%s: refuses the layout with the recorded errors', (_, fixture) => {
    expect(() => convert(fixture)).toThrow(expect.objectContaining({ errors: fixture.response.errors }))
  })

  it('is deterministic: the same request gives the same bytes', () => {
    for (const fixture of fixtures) {
      expect(JSON.stringify(convert(fixture))).toBe(JSON.stringify(convert(fixture)))
    }
  })

  it('has a fixture for every block that is a section', () => {
    const covered = new Set(fixtures.flatMap(({ request }) => request.kind === 'group'
      ? [`${request.legacy.slot}_menu`]
      : request.legacy.sections.map(({ type }) => type)))
    const sections = definitions.filter(block => block.kinds.includes('section')).map(block => block.type)

    expect(sections.filter(type => !covered.has(type))).toEqual([])
  })

  it('refuses a section of a type with no block, naming where, and converts nothing', () => {
    const unknown = { id: 'abc', type: 'page_hero', title: '', isVisible: true, props: {} }

    expect(() => convertLegacyLayout({ sections: [unknown] }, { kind: 'template', defaultLocale: 'el', registry, roots: BUILDER_DOCUMENT_ROOTS }))
      .toThrow(expect.objectContaining({ errors: [expect.objectContaining({ path: '/sections/abc', code: 'unknown_block_type' })] }))
  })

  it('refuses settings that fail the block\'s own schema, with every reason', () => {
    const sections = [
      { id: 'a', type: 'spacer', title: '', isVisible: true, props: { height: 'huge' } },
      { id: 'b', type: 'divider', title: '', isVisible: true, props: { variant: 'wavy' } },
    ]

    expect(() => convertLegacyLayout({ sections }, { kind: 'template', defaultLocale: 'el', registry, roots: BUILDER_DOCUMENT_ROOTS }))
      .toThrow(expect.objectContaining({ errors: [
        expect.objectContaining({ path: '/sections/a/settings', code: 'invalid_settings' }),
        expect.objectContaining({ path: '/sections/b/settings', code: 'invalid_settings' }),
      ] }))
  })
})

describe('porting a legacy section to a block', () => {
  const sections = layouts.flatMap(fixture => (fixture.request.legacy as LegacyLayout).sections.map(section => ({ fixture, section })))

  it.each(sections.map(({ fixture, section }) => [`${fixture.name}: ${section.type}`, fixture, section] as const))('%s: the component gets the same props', (_, fixture, section) => {
    const document = parseDocument(fixture.response.document, 'page', registry)

    expect(document.order, 'every section parses').toEqual(fixture.response.document.order)
    expect(JSON.parse(JSON.stringify(sectionProps(document.sections[section.id]!, registry)))).toEqual(legacyProps(section))
  })

  it('writes a node Django could store: its settings are valid and the schema strips none of them', () => {
    const check = (node: BuilderNode, name: string) => {
      const parsed = registry.get(node.type.split('@')[0]!)!.schema.safeParse(node.settings)
      expect(parsed.success, name).toBe(true)
      expect(parsed.data, name).toEqual(node.settings)
      Object.values(node.blocks ?? {}).forEach(child => check(child, name))
    }
    for (const { name, response } of fixtures) Object.values(response.document.sections).forEach(node => check(node, name))
  })

  it('names every child <parent id>-<n>, from 1 in order, at every depth', () => {
    const check = (id: string, node: BuilderNode) => {
      expect(node.blockOrder ?? []).toEqual((node.blockOrder ?? []).map((_, i) => `${id}-${i + 1}`))
      expect(Object.keys(node.blocks ?? {})).toEqual(node.blockOrder ?? [])
      for (const [childId, child] of Object.entries(node.blocks ?? {})) check(childId, child)
    }
    // A menu's nodes keep the uuids of the rows they come from, so only layouts are numbered.
    for (const { response } of layouts) Object.entries(response.document.sections).forEach(([id, node]) => check(id, node))
  })

  it('names an overlay node only by an id the document has, and a pointer the block calls translatable', () => {
    const idsOf = (id: string, node: BuilderNode): [string, BuilderNode][] =>
      [[id, node], ...Object.entries(node.blocks ?? {}).flatMap(([childId, child]) => idsOf(childId, child))]
    for (const { name, response } of fixtures) {
      const nodes = new Map(Object.entries(response.document.sections).flatMap(([id, node]) => idsOf(id, node)))
      for (const byNode of Object.values(response.i18n)) {
        for (const [id, pointers] of Object.entries(byNode)) {
          if (id === '@document') continue
          const node = nodes.get(id)
          expect(node, `${name}: ${id}`).toBeDefined()
          const definition = registry.get(node!.type.split('@')[0]!)!
          for (const pointer of Object.keys(pointers)) expect(definition.translatable, `${name}: ${id}${pointer}`).toContain(pointer)
        }
      }
    }
  })
})
