import { describe, expect, it } from 'vitest'
import { buildBlockCatalogue, definitionsForDesign } from '~~/server/utils/builderCatalogue'
import { parseDocument } from '~~/shared/builder/document'
import { BUILDER_DOCUMENT_ROOTS } from '~~/shared/builder/documentRoots'
import { linkPointers } from '~~/shared/builder/linkPointers'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * Rules every REAL block of `app/blocks` keeps, whatever it is. The unit
 * project's `#builder-blocks` is a fixture set, so these read the files
 * themselves. Vitest caches this file's transform, globs included: after
 * ADDING a block file locally, edit this comment once or it is not seen (CI
 * starts clean).
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const registry = new Map(definitions.map(block => [block.type, block]))

/** `link` is `pointer`, or lies under it (`*` matches one segment either way). */
const overlaps = (link: string, pointer: string) => {
  const a = link.split('/')
  const b = pointer.split('/')
  return b.length <= a.length && b.every((part, index) => part === a[index] || part === '*' || a[index] === '*')
}

describe('the real blocks', () => {
  it('make a consistent catalogue', () => {
    const { blocks } = buildBlockCatalogue(definitions)

    expect(blocks.map(block => block.type)).toEqual(definitions.map(block => block.type).sort())
  })

  it('never let a link be translated: no link setting is, or sits under, a translatable pointer', () => {
    const found = definitions.flatMap(block => block.linkRefs.flatMap(link =>
      block.translatable.filter(pointer => overlaps(link, pointer)).map(pointer => `${block.type}: ${link} under ${pointer}`)))

    expect(found).toEqual([])
  })

  it('never let a document root\'s link be translated either', () => {
    const found = Object.entries(BUILDER_DOCUMENT_ROOTS).flatMap(([kind, root]) => linkPointers(root!.schema).flatMap(link =>
      root!.translatable.filter(pointer => overlaps(link, pointer)).map(pointer => `${kind}: ${link} under ${pointer}`)))

    expect(found).toEqual([])
  })

  it('mark rich text so Django sanitises it on save', () => {
    const richText = buildBlockCatalogue(definitions).blocks.find(block => block.type === 'rich_text')!

    expect(richText.schema).toMatchObject({ properties: { content: { contentMediaType: 'text/html' } } })
  })

  it('state the rule that a trust badge needs a logo or an icon, for Django and for the parse alike', () => {
    const badge = buildBlockCatalogue(definitions).blocks.find(block => block.type === 'trust_badge')!
    const bare = { type: 'trust_badges@1', settings: {}, blocks: { a: { type: 'trust_badge@1', settings: { kind: 'custom', label: 'Bare' } } }, blockOrder: ['a'] }

    expect(badge.schema.anyOf).toEqual([{ required: ['imageUrl'] }, { required: ['icon'] }])
    expect(parseDocument({ sections: { s1: bare }, order: ['s1'] }, 'page', registry, { featureOn: () => true }).sections.s1).not.toHaveProperty('blocks')
  })

  it('keep what a design does not draw out of that design catalogue, and miss nothing it draws', () => {
    const types = (design?: string) => definitionsForDesign(definitions, design).map(block => block.type)

    expect(types('webside')).toEqual(expect.arrayContaining(['about_content', 'vision_content', 'what_is_microlearning', 'why_microlearning']))
    expect(types('webside')).not.toContain('contact_panel')
    expect(types('ekfyseosfyteias')).toEqual(expect.arrayContaining(['contact_panel', 'partner_strip', 'partner', 'pull_quote']))
    expect(types('ekfyseosfyteias')).not.toContain('about_content')
    expect(types('demo')).not.toContain('about_content')
    expect(types('demo')).not.toContain('partner_strip')
    expect(types()).toHaveLength(definitions.length)
  })

  it('make a consistent catalogue of every design: no section allows a child its design does not have', () => {
    for (const design of [undefined, 'webside', 'ekfyseosfyteias', 'demo']) {
      expect(() => buildBlockCatalogue(definitionsForDesign(definitions, design)), String(design)).not.toThrow()
    }
  })

  it('are closed: a key the schema does not name is refused, by Django and by the parse', () => {
    for (const block of buildBlockCatalogue(definitions).blocks) {
      expect(block.schema.additionalProperties, block.type).toBe(false)
    }
  })
})
