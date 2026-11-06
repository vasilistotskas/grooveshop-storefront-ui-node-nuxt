import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import {
  builderMissingTranslations,
  builderTranslatedSettings,
  builderTranslationAt,
  setNodeTranslation,
  upgradeNodeTranslations,
} from '~/utils/builderTranslation'
import type { BlockDefinition, BuilderNode } from '~~/shared/types/builder'
import type { BuilderWorkingCopy } from '~~/shared/types/builderEditor'

const item = defineBlock({ type: 'item', version: 1, kinds: ['block'], schema: z.object({ label: z.string().optional(), icon: z.string().optional() }), translatable: ['/label'] })
const band = defineBlock({
  type: 'band',
  version: 1,
  kinds: ['section'],
  schema: z.object({ title: z.string().optional(), prompt: z.object({ text: z.string().optional() }).optional(), surface: z.enum(['default', 'muted']).optional() }),
  translatable: ['/title', '/prompt/text'],
  children: { allowed: ['item'] },
})
const blocks = new Map<string, BlockDefinition>([item, band].map(block => [block.type, block]))

const node = (type: string, settings: Record<string, unknown>, children?: Record<string, BuilderNode>): BuilderNode => ({
  type,
  settings,
  ...(children && { blocks: children, blockOrder: Object.keys(children) }),
})

/** A band with a title and a prompt, of two items (one labelled), its title already in English. */
const page = (): BuilderWorkingCopy => ({
  draft: {
    sections: {
      band: node('band@1', { title: 'Προσφορές', prompt: { text: 'Δείτε τες' }, surface: 'muted' }, {
        a: node('item@1', { label: 'Ένα', icon: 'i-lucide-star' }),
        b: node('item@1', { icon: 'i-lucide-star' }),
      }),
    },
    order: ['band'],
  },
  i18n: { en: { band: { '/title': 'Offers' } } },
})

describe('a node\'s translation', () => {
  it('is read by language, node and pointer', () => {
    expect(builderTranslationAt(page(), 'en', 'band', '/title')).toBe('Offers')
    expect(builderTranslationAt(page(), 'en', 'band', '/prompt/text')).toBeUndefined()
    expect(builderTranslationAt(page(), 'fr', 'band', '/title')).toBeUndefined()
  })

  it('is written into the language\'s overlay, and never into the draft', () => {
    const copy = page()
    const next = setNodeTranslation(copy, 'en', 'a', '/label', 'One')

    expect(next.i18n).toEqual({ en: { band: { '/title': 'Offers' }, a: { '/label': 'One' } } })
    expect(next.draft).toEqual(copy.draft)
    expect(copy.i18n).toEqual(page().i18n)
  })

  it('is taken out by an empty value, the node and the language with their last one', () => {
    expect(setNodeTranslation(page(), 'en', 'band', '/title', '').i18n).toEqual({})
    expect(setNodeTranslation(setNodeTranslation(page(), 'en', 'a', '/label', 'One'), 'en', 'a', '/label', undefined).i18n)
      .toEqual({ en: { band: { '/title': 'Offers' } } })
  })
})

describe('builderTranslatedSettings', () => {
  it('reads the settings as the language does: the draft\'s, with each translation in its place', () => {
    const settings = page().draft.sections.band!.settings

    expect(builderTranslatedSettings(settings, { '/title': 'Offers', '/prompt/text': 'See them' }))
      .toEqual({ title: 'Offers', prompt: { text: 'See them' }, surface: 'muted' })
    expect(builderTranslatedSettings({}, { '/prompt/text': 'See them' })).toEqual({ prompt: { text: 'See them' } })
    expect(settings).toEqual(page().draft.sections.band!.settings)
  })
})

describe('upgradeNodeTranslations', () => {
  /** A band that had a `title` beside its `heading`, which won when both were set: one `heading` now. */
  const banner = defineBlock({
    type: 'banner',
    version: 2,
    kinds: ['section'],
    schema: z.object({ heading: z.string().optional(), note: z.string().optional(), prompt: z.object({ text: z.string().optional() }).optional() }),
    translatable: ['/heading', '/note', '/prompt/text'],
    upgrade: {
      1: ({ settings: { title, heading, dropped: _dropped, ...kept }, ...body }) => ({
        ...body,
        settings: { ...kept, ...((heading ?? title) !== undefined && { heading: heading ?? title }) },
      }),
    },
  })

  it('moves a translation with the setting the upgrade renames', () => {
    expect(upgradeNodeTranslations(node('banner@1', { title: 'Νέα' }), banner, { '/title': 'New' })).toEqual({ '/heading': 'New' })
  })

  it('keeps what the language reads when the upgrade merges two settings', () => {
    const both = node('banner@1', { title: 'Τίτλος', heading: 'Επικεφαλίδα' })

    // The heading won, in the draft's text, so the title's translation was never read.
    expect(upgradeNodeTranslations(both, banner, { '/title': 'Title' })).toEqual({})
    expect(upgradeNodeTranslations(both, banner, { '/title': 'Title', '/heading': 'Heading' })).toEqual({ '/heading': 'Heading' })
  })

  it('drops a translation of a setting the upgrade takes out', () => {
    expect(upgradeNodeTranslations(node('banner@1', { dropped: 'Α', note: 'Β' }), banner, { '/dropped': 'A', '/note': 'B' })).toEqual({ '/note': 'B' })
  })

  it('leaves out an entry that only repeats the draft\'s text, and keeps one that was already there', () => {
    expect(upgradeNodeTranslations(node('banner@1', { title: 'Same' }), banner, { '/title': 'Same' })).toEqual({})
    expect(upgradeNodeTranslations(node('banner@1', { note: 'Same' }), banner, { '/note': 'Same' })).toEqual({ '/note': 'Same' })
  })

  it('reads a setting inside an object by its whole pointer', () => {
    expect(upgradeNodeTranslations(node('banner@1', { prompt: { text: 'Δείτε' } }), banner, { '/prompt/text': 'See' })).toEqual({ '/prompt/text': 'See' })
  })

  it('takes out an empty translation, which says nothing', () => {
    expect(upgradeNodeTranslations(node('banner@1', { note: 'Β' }), banner, { '/note': '' })).toEqual({})
  })

  it('returns the translations of a node already current as they are', () => {
    const translations = { '/heading': 'Now', '/stale': 'kept' }

    expect(upgradeNodeTranslations(node('banner@2', { heading: 'Τώρα' }), banner, translations)).toBe(translations)
  })
})

describe('builderMissingTranslations', () => {
  it('counts the translatable settings with text in the draft and none in the language, at every depth', () => {
    // The band's prompt and the first item's label; the band's title is translated, the second item has no label.
    expect(builderMissingTranslations(page(), 'en', blocks)).toBe(2)
    expect(builderMissingTranslations(setNodeTranslation(page(), 'en', 'a', '/label', 'One'), 'en', blocks)).toBe(1)
  })

  it('counts nothing of a block this build does not define', () => {
    const copy: BuilderWorkingCopy = { draft: { sections: { x: node('gone@1', { title: 'Κάτι' }) }, order: ['x'] }, i18n: {} }

    expect(builderMissingTranslations(copy, 'en', blocks)).toBe(0)
  })
})
