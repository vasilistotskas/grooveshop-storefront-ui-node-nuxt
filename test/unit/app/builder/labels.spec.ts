import { describe, expect, it } from 'vitest'
import el from '~/builder/labels/el.json'
import en from '~/builder/labels/en.json'
import { BUILDER_EDITOR_GROUPS } from '~~/shared/constants/builderEditor'
import { STATIC_LAYOUT_ROUTES } from '~~/shared/utils/staticLayoutRoutes'
import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * The editor names every block of this build, every section group and every
 * page type a static route renders (a `template:<name>` document), in
 * every language the storefront speaks (`app/builder/labels/<locale>.json`),
 * and names nothing that is not there: a block added without its labels, or
 * removed with them left behind, fails here rather than showing a merchant
 * a type name or keeping dead text.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/**/*.block.ts', { eager: true })
const blockTypes = Object.values(modules).map(module => module.default.type).sort()

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

  it('name every section group the editor shows, and only those', () => {
    expect(Object.keys(labels.groups).sort()).toEqual([...BUILDER_EDITOR_GROUPS].sort())
    expect(Object.values(labels.groups).every(label => label.trim() !== '')).toBe(true)
  })
})
