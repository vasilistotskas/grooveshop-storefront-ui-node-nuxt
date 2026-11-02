import { describe, expect, it } from 'vitest'
import el from '~/builder/labels/el.json'
import en from '~/builder/labels/en.json'
import { BUILDER_BLOCK_CATEGORIES, BUILDER_EDITOR_GROUPS } from '~~/shared/constants/builderEditor'
import { STATIC_LAYOUT_ROUTES } from '~~/shared/utils/staticLayoutRoutes'
import { LINK_ROUTES } from '~~/shared/constants/builder'
import { builderRouteLabelKey, builderSettingsFields, flattenSettingsFields } from '~/utils/builderSettingsFields'
import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * The editor names every block of this build, every section group and every
 * page type a static route renders (a `template:<name>` document), every
 * setting of every block with each of its choices, and every fixed route a
 * link may name, in
 * every language the storefront speaks (`app/builder/labels/<locale>.json`),
 * and names nothing that is not there: a block added without its labels, or
 * removed with them left behind, fails here rather than showing a merchant
 * a type name or keeping dead text.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/**/*.block.ts', { eager: true })
const blockTypes = Object.values(modules).map(module => module.default.type).sort()

/** Every settings field of every block, depth first. */
const fields = Object.values(modules).flatMap(module => flattenSettingsFields(builderSettingsFields(module.default)))
const settingPaths = [...new Set(fields.map(field => field.path))].sort()
/** The choices each setting name offers, across blocks: `options.<name>.<value>`. */
const choices = fields.flatMap(field => field.kind === 'choice' ? field.options.map(value => `${field.path.split('.').at(-1)}.${value}`) : [])
const choiceKeys = [...new Set(choices)].sort()

/** The labels object flattened to dotted keys whose values are text. */
function keysOf(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => typeof value === 'object' && value !== null
    ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
    : [`${prefix}${key}`])
}

const files: Record<SupportedLocale, typeof el> = { el, en }

describe.each(SUPPORTED_LOCALES)('the editor labels in %s', (locale) => {
  const labels = files[locale]

  it('cover the blocks of this build', () => {
    expect(blockTypes.length).toBeGreaterThan(0)
    expect(Object.keys(labels.blocks).sort()).toEqual(blockTypes)
  })

  it('name every block with text', () => {
    const blank = Object.entries(labels.blocks).filter(([, block]) => block.label.trim() === '').map(([type]) => type)

    expect(blank).toEqual([])
  })

  it('name every page type a static route renders, and only those', () => {
    expect(Object.keys(labels.templates).sort()).toEqual(Object.keys(STATIC_LAYOUT_ROUTES).sort())
    expect(Object.values(labels.templates).every(label => label.trim() !== '')).toBe(true)
  })

  it('name every setting of every block, and only those', () => {
    const named = keysOf(labels.settings).filter(key => key.endsWith('.label')).map(key => key.slice(0, -'.label'.length)).sort()

    expect(named).toEqual(settingPaths)
  })

  it('name every choice a setting offers, and only those', () => {
    expect(keysOf(labels.options).sort()).toEqual(choiceKeys)
  })

  it('name every fixed route a link may name, and only those', () => {
    expect(Object.keys(labels.routes).sort()).toEqual(LINK_ROUTES.map(builderRouteLabelKey).sort())
  })

  it('leave no name blank', () => {
    const blank = keysOf({ settings: labels.settings, options: labels.options, routes: labels.routes })
      .filter(key => String(key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], labels)).trim() === '')

    expect(blank).toEqual([])
  })

  it('name every store feature a block needs, and only those', () => {
    const needed = [...new Set(Object.values(modules).flatMap(module => module.default.feature ?? []))].sort()

    expect(Object.keys(labels.features).sort()).toEqual(needed)
  })

  it('name every tab of the add-section library, and only those', () => {
    expect(Object.keys(labels.categories).sort()).toEqual([...BUILDER_BLOCK_CATEGORIES].sort())
  })

  it('name every section group the editor shows, and only those', () => {
    expect(Object.keys(labels.groups).sort()).toEqual([...BUILDER_EDITOR_GROUPS].sort())
    expect(Object.values(labels.groups).every(label => label.trim() !== '')).toBe(true)
  })
})
