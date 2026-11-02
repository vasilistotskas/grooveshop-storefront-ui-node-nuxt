import { describe, expect, it } from 'vitest'
import el from '~/builder/labels/el.json'
import { builderPresetNode } from '~/utils/builderLibrary'
import { BUILDER_DEFAULT_PRESET } from '~~/shared/constants/builderEditor'
import type { BlockDefinition, BuilderNode } from '~~/shared/types/builder'

/**
 * What the add-section library inserts: every block it can offer has a
 * default preset, and that preset, with its text filled in from the labels
 * in the language a draft is written in, is a node a draft save accepts: its
 * settings parse with the block's schema, and its children are of types the
 * block allows, no more than it holds, and themselves valid.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const blocks = new Map(Object.values(modules).map(module => [module.default.type, module.default]))
/**
 * The blocks the library cannot offer yet: each needs an image, which is no
 * text a preset can hold, until the media picker. Every other block is offered.
 */
const AWAITING_MEDIA = ['gallery_image', 'hero_slide']
const offered = [...blocks.values()].filter(block => !block.deprecated && !AWAITING_MEDIA.includes(block.type))

const presetText = (type: string, preset: string) =>
  (el.presets as Record<string, Record<string, Record<string, string>> | undefined>)[type]?.[preset]

let counter = 0
const newId = () => `n${++counter}`

/** What is wrong with a node, as a save would see it: none for a valid one. */
function problems(node: BuilderNode, path: string): string[] {
  const type = node.type.split('@')[0]!
  const definition = blocks.get(type)!
  const found: string[] = []
  const settings = definition.schema.safeParse(node.settings)
  if (!settings.success) found.push(`${path}: ${settings.error.issues.map(issue => `${issue.path.join('.')} ${issue.code}`).join(', ')}`)
  const children = node.blockOrder ?? []
  if (definition.limits.maxBlocks !== undefined && children.length > definition.limits.maxBlocks) found.push(`${path}: ${children.length} children, at most ${definition.limits.maxBlocks}`)
  for (const id of children) {
    const child = node.blocks![id]!
    const childType = child.type.split('@')[0]!
    if (!definition.children.allowed.includes(childType)) found.push(`${path}/${id}: ${childType} may not sit in ${type}`)
    found.push(...problems(child, `${path}/${childType}`))
  }
  return found
}

describe('the presets the library inserts', () => {
  it.each(offered.map(block => [block.type, block] as const))('%s has a default preset that saves', (_type, block) => {
    expect(block.presets?.map(({ id }) => id)).toContain(BUILDER_DEFAULT_PRESET)

    expect(problems(builderPresetNode(block, BUILDER_DEFAULT_PRESET, blocks, presetText, newId), block.type)).toEqual([])
  })

  it('offers every block but those awaiting the media picker, which have no preset to insert', () => {
    const withoutPreset = [...blocks.values()].filter(block => !block.deprecated && !block.presets?.length).map(block => block.type).sort()

    expect(withoutPreset).toEqual(AWAITING_MEDIA)
  })

  it('lists every section under a tab of the library, and a block that only sits inside another under none', () => {
    const misplaced = offered.filter(block => Boolean(block.editor.category) !== block.kinds.includes('section')).map(block => block.type)

    expect(misplaced).toEqual([])
  })

  it('names text only for presets and settings that exist', () => {
    const stray = Object.entries(el.presets as Record<string, Record<string, Record<string, string>>>).flatMap(([type, presets]) =>
      Object.entries(presets).flatMap(([preset, settings]) => {
        const block = blocks.get(type)
        if (!block?.presets?.some(({ id }) => id === preset)) return [`${type}.${preset}`]
        return Object.keys(settings).filter(path => !(path.split('.')[0]! in block.schema.shape)).map(path => `${type}.${preset}.${path}`)
      }))

    expect(stray).toEqual([])
  })
})
