import { describe, expect, it } from 'vitest'
import el from '~/builder/labels/el.json'
import en from '~/builder/labels/en.json'
import { BUILDER_BLOCK_CATEGORIES, BUILDER_EDITOR_GROUPS } from '~~/shared/constants/builderEditor'
import { STATIC_LAYOUT_ROUTES } from '~~/shared/utils/staticLayoutRoutes'
import { LINK_ROUTES } from '~~/shared/constants/builder'
import { BUILDER_DOCUMENT_ROOTS, themeContrastRulesFor } from '~~/shared/builder/documentRoots'
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
/** Each block's settings fields, depth first, by block type. */
const fieldsOf = new Map(Object.values(modules).map(module => [module.default.type, flattenSettingsFields(builderSettingsFields(module.default))]))
/** The blocks that have a setting at `path`. */
const blocksWith = (path: string) => [...fieldsOf].filter(([, own]) => own.some(field => field.path === path)).map(([type]) => type)
/** Whether a block's setting at `path` offers `value` among its choices. */
const offers = (type: string, path: string, value: string) => (fieldsOf.get(type) ?? []).some(field =>
  field.path === path && (field.kind === 'choice' || field.kind === 'icon') && field.options.includes(value))
/** The choices each setting name offers, across blocks: `options.<name>.<value>`. */
const choices = fields.flatMap(field => field.kind === 'choice' || field.kind === 'icon' ? field.options.map(value => `${field.path.split('.').at(-1)}.${value}`) : [])
const choiceKeys = [...new Set(choices)].sort()

/** Whether `text` names `label` as a word of its own, not inside a longer one («Large» is not in «Larger»). */
const mentions = (text: string, label: string) => {
  const at = text.indexOf(label)
  if (at === -1) return false
  const isWordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}]/u.test(char)
  for (let start = at; start !== -1; start = text.indexOf(label, start + 1)) {
    if (!isWordChar(text[start - 1]) && !isWordChar(text[start + label.length])) return true
  }
  return false
}

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

  it('name and explain every text a page or template holds of its own, and only those', () => {
    const roots = [BUILDER_DOCUMENT_ROOTS.page, BUILDER_DOCUMENT_ROOTS.template].flatMap(root => root ? root.translatable : [])
    const keys = [...new Set(roots.map(pointer => pointer.slice(1)))].sort()

    expect(keys.length).toBeGreaterThan(0)
    expect(Object.keys(labels.documentSettings).sort()).toEqual(keys)
    expect(Object.values(labels.documentSettings).every(setting => setting.label.trim() !== '' && setting.help.trim() !== '')).toBe(true)
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

  // A line true of one block only is written under that block
  // (`blocks.<type>.settings.<path>.help`, `builderSettingHelpKey`), where no
  // other block with the setting reads it.
  it('explain a block\u2019s own setting only under a setting that block has', () => {
    const own = Object.entries(labels.blocks).flatMap(([type, block]) => 'settings' in block ? keysOf(block.settings).map(key => ({ type, key })) : [])
    const stray = own.filter(({ type, key }) => !key.endsWith('.help') || !blocksWith(key.slice(0, -'.help'.length)).includes(type))

    expect(own.length).toBeGreaterThan(0)
    expect(stray).toEqual([])
  })

  // A shared help line shows on every block with the setting, so it may not
  // name a choice some of them do not offer: the posts band's icon line named
  // its «Κάρτα με άρθρα» layout and showed on the footer columns (2026-11-13).
  it('name in a shared help line no choice that a block with the setting lacks', () => {
    const optionLabels = keysOf(labels.options).map((key) => {
      const [name, ...value] = key.split('.')
      return { name: name!, value: value.join('.'), label: String(key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], labels.options)) }
    })
    const leaks = keysOf(labels.settings).filter(key => key.endsWith('.help')).flatMap((key) => {
      const path = key.slice(0, -'.help'.length)
      const help = String(key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], labels.settings))
      const named = [...new Set(optionLabels.map(({ label }) => label))].filter(label => mentions(help, label))
      return named.flatMap((label) => {
        // A label the setting's own choices carry names that choice; any other names its own setting's.
        const ownChoice = optionLabels.filter(option => option.label === label && option.name === path)
        const meant = ownChoice.length > 0 ? ownChoice : optionLabels.filter(option => option.label === label)
        return blocksWith(path)
          .filter(type => !meant.some(({ name, value }) => offers(type, name, value)))
          .map(type => `${path}: «${label}» (${meant.map(({ name, value }) => `${name}.${value}`).join(', ')}) on ${type}`)
      })
    })

    expect(leaks).toEqual([])
  })

  // The theme panel's rows and the Publish dialog's warning name a rule by its id.
  it('name every contrast rule of every design, and only those', () => {
    const ids = ([null, 'volt'] as const).flatMap(design => themeContrastRulesFor(design).map(({ id }) => id))
    expect(Object.keys(labels.contrastRules).sort()).toEqual([...new Set(ids)].sort())
  })
})
