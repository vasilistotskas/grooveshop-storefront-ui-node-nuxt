import { describe, expect, it } from 'vitest'
import { ZodBuilderDocumentParams, ZodBuilderDraft } from '~~/shared/schemas/builderEditor'

const node = (extra: Record<string, unknown> = {}) => ({ type: 'hero_banner@1', settings: { heading: 'Γεια' }, ...extra })

describe('ZodBuilderDraft', () => {
  it('reads a working copy with nested blocks, keeping the settings as they are', () => {
    const draft = {
      settings: { seoTitle: 'Αρχική' },
      sections: { hero: node({ blocks: { s1: node({ type: 'stat@1' }) }, blockOrder: ['s1'] }) },
      order: ['hero'],
    }

    expect(ZodBuilderDraft.parse(draft)).toEqual(draft)
  })

  it.each([
    ['an order that misses a section', { sections: { a: node(), b: node() }, order: ['a'] }],
    ['an order that names a section twice', { sections: { a: node() }, order: ['a', 'a'] }],
    ['an order that names a section the map lacks', { sections: { a: node() }, order: ['a', 'b'] }],
    ['a blockOrder that misses a block', { sections: { a: node({ blocks: { x: node() }, blockOrder: [] }) }, order: ['a'] }],
    ['blocks without a blockOrder', { sections: { a: node({ blocks: { x: node() } }) }, order: ['a'] }],
    ['a node without settings', { sections: { a: { type: 'hero_banner@1' } }, order: ['a'] }],
    ['an id Django would refuse', { sections: { 'a b': node() }, order: ['a b'] }],
  ])('refuses %s', (_case, draft) => {
    expect(ZodBuilderDraft.safeParse(draft).success).toBe(false)
  })
})

describe('ZodBuilderDocumentParams', () => {
  it.each(['theme', 'group:header', 'template:home', 'page:summer-sale_2026'])('takes the key %j', (key) => {
    expect(ZodBuilderDocumentParams.safeParse({ key }).success).toBe(true)
  })

  it.each(['home', 'page:', 'page:Summer', 'page:-x', 'theme:x', 'template:a/b', `page:${'a'.repeat(65)}`])('refuses the key %j', (key) => {
    expect(ZodBuilderDocumentParams.safeParse({ key }).success).toBe(false)
  })
})
