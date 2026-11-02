import { describe, expect, it } from 'vitest'
import { resolveWorkingCopy } from '~~/shared/builder/resolve'
import type { BuilderWorkingCopy } from '~~/shared/types/builderEditor'

/**
 * A working copy resolved for one language as Django resolves a published
 * document (`builder/published.py: resolve_document`). The first cases are
 * the ones Django's own `TestPublishedRead` pins, on the same page.
 */
const page = (): BuilderWorkingCopy => ({
  draft: {
    settings: { seoTitle: 'Αρχική' },
    sections: {
      hero_1: { type: 'hero@1', settings: { title: 'Καλώς ήρθατε', body: '<p>ελ</p>' } },
      banner_1: { type: 'banner@1', disabled: true, settings: { text: 'κρυφό' } },
      banner_2: { type: 'banner@1', settings: { text: 'Μπάνερ' } },
    },
    order: ['hero_1', 'banner_1', 'banner_2'],
  },
  i18n: {
    en: {
      'hero_1': { '/title': 'Welcome', '/body': '<p>en</p>' },
      'banner_2': { '/text': 'Banner' },
      '@document': { '/seoTitle': 'Home' },
    },
  },
})

describe('resolveWorkingCopy', () => {
  it('resolves the default language, and drops disabled nodes', () => {
    expect(resolveWorkingCopy(page(), 'el')).toEqual({
      settings: { seoTitle: 'Αρχική' },
      sections: {
        hero_1: { type: 'hero@1', settings: { title: 'Καλώς ήρθατε', body: '<p>ελ</p>' } },
        banner_2: { type: 'banner@1', settings: { text: 'Μπάνερ' } },
      },
      order: ['hero_1', 'banner_2'],
    })
  })

  it('merges the overlay of the language asked, the document\'s own settings included', () => {
    const resolved = resolveWorkingCopy(page(), 'en')

    expect(resolved.sections.hero_1!.settings).toEqual({ title: 'Welcome', body: '<p>en</p>' })
    expect(resolved.sections.banner_2!.settings).toEqual({ text: 'Banner' })
    expect(resolved.settings).toEqual({ seoTitle: 'Home' })
  })

  it('gives a language with no overlay the default content', () => {
    expect(resolveWorkingCopy(page(), 'fr').sections.banner_2!.settings).toEqual({ text: 'Μπάνερ' })
  })

  it('never takes an overlay for the default language', () => {
    const copy = page()
    copy.i18n.el = { banner_2: { '/text': 'never' } }

    expect(resolveWorkingCopy(copy, 'el').sections.banner_2!.settings).toEqual({ text: 'Μπάνερ' })
  })

  it('drops a disabled block with its children, and keeps the order of the rest', () => {
    const copy: BuilderWorkingCopy = {
      draft: {
        sections: {
          faq: {
            type: 'faq@1',
            settings: {},
            blocks: {
              q1: { type: 'faq_item@1', settings: { q: 'α' } },
              q2: { type: 'faq_item@1', disabled: true, settings: { q: 'β' }, blocks: { x: { type: 'x@1', settings: {} } }, blockOrder: ['x'] },
              q3: { type: 'faq_item@1', settings: { q: 'γ' } },
            },
            blockOrder: ['q3', 'q2', 'q1'],
          },
        },
        order: ['faq'],
      },
      i18n: { en: { q3: { '/q': 'c' } } },
    }

    expect(resolveWorkingCopy(copy, 'en').sections.faq).toEqual({
      type: 'faq@1',
      settings: {},
      blocks: { q3: { type: 'faq_item@1', settings: { q: 'c' } }, q1: { type: 'faq_item@1', settings: { q: 'α' } } },
      blockOrder: ['q3', 'q1'],
    })
  })

  it('sets a pointer only where its parent exists, as Django does', () => {
    const copy: BuilderWorkingCopy = {
      draft: {
        sections: { s: { type: 's@1', settings: { prompt: { title: 'Γεια' }, items: ['α', 'β'], label: 'x' } } },
        order: ['s'],
      },
      i18n: {
        en: {
          s: {
            '/prompt/title': 'Hi',
            '/prompt/text': 'new key in an existing object',
            '/items/1': 'b',
            '/items/2': 'past the end of the list',
            '/missing/title': 'no parent',
            '/label/inner': 'parent is not an object',
            'no-leading-slash': 'not a pointer',
          },
        },
      },
    }

    expect(resolveWorkingCopy(copy, 'en').sections.s!.settings).toEqual({
      prompt: { title: 'Hi', text: 'new key in an existing object' },
      items: ['α', 'b'],
      label: 'x',
    })
  })

  it('reads ~1 and ~0 in a pointer as / and ~', () => {
    const copy: BuilderWorkingCopy = {
      draft: { sections: { s: { type: 's@1', settings: { 'a/b': 'x', 'c~d': 'y' } } }, order: ['s'] },
      i18n: { en: { s: { '/a~1b': 'X', '/c~0d': 'Y' } } },
    }

    expect(resolveWorkingCopy(copy, 'en').sections.s!.settings).toEqual({ 'a/b': 'X', 'c~d': 'Y' })
  })

  it('changes nothing in the copy it is given, and shares nothing with it', () => {
    const copy = page()
    const before = structuredClone(copy)
    const resolved = resolveWorkingCopy(copy, 'en')
    ;(resolved.sections.hero_1!.settings as Record<string, unknown>).title = 'changed'

    expect(copy).toEqual(before)
  })

  it('leaves out an order entry with no section', () => {
    const copy = page()
    copy.draft.order = ['ghost', 'hero_1']

    expect(resolveWorkingCopy(copy, 'el').order).toEqual(['hero_1'])
  })
})
