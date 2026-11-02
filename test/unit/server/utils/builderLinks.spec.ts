import { describe, expect, it } from 'vitest'
import { collectLinkRefs, resolveLinks } from '~~/server/utils/builderLinks'
import type { LinkTargets } from '~~/server/utils/builderLinks'
import type { BuilderDocument } from '~~/shared/types/builder'

/** A section holding one `promo_item` per link: the fixture block whose `href` is a link. */
function pageWith(...links: unknown[]): BuilderDocument {
  const blocks = Object.fromEntries(links.map((href, index) => [`i${index}`, { type: 'promo_item@1', settings: { label: `Item ${index}`, href } }]))
  return {
    sections: { s: { type: 'promo_banner@2', settings: { title: 'Sale' }, blocks, blockOrder: Object.keys(blocks) } },
    order: ['s'],
  }
}

const hrefsOf = (document: BuilderDocument) =>
  document.sections.s!.blockOrder!.map(id => document.sections.s!.blocks![id]!.settings.href)

const targets: LinkTargets = {
  slugs: {
    product: new Map([[2, 'mini-powerbank']]),
    category: new Map([[3, 'powerbank']]),
    blogPost: new Map([[4, 'guide']]),
    blogCategory: new Map([[5, 'news']]),
  },
  published: { pages: new Set(['about']), contentPages: new Set(['privacy', 'faq']) },
}

describe('collectLinkRefs', () => {
  it('lists the records a document names, each once, however deep and however often', () => {
    const document = pageWith(
      { ref: { kind: 'product', id: 2 } },
      { route: '/offers' },
      { href: 'https://example.com' },
      { ref: { kind: 'product', id: 2 } },
      { ref: { kind: 'page', id: 'about' } },
    )

    expect(collectLinkRefs(document)).toEqual([{ kind: 'product', id: 2 }, { kind: 'page', id: 'about' }])
  })

  it('finds nothing in a document with no link, or whose link setting is absent', () => {
    expect(collectLinkRefs(pageWith(undefined))).toEqual([])
    expect(collectLinkRefs({ sections: {}, order: [] })).toEqual([])
  })
})

describe('resolveLinks', () => {
  it.each([
    [{ href: 'https://example.com/a' }, 'https://example.com/a'],
    [{ route: '/offers' }, '/offers'],
    [{ ref: { kind: 'product', id: 2 } }, '/products/2/mini-powerbank'],
    [{ ref: { kind: 'category', id: 3 } }, '/products/category/3/powerbank'],
    [{ ref: { kind: 'blogPost', id: 4 } }, '/blog/post/4/guide'],
    [{ ref: { kind: 'blogCategory', id: 5 } }, '/blog/category/5/news'],
    [{ ref: { kind: 'page', id: 'about' } }, '/about'],
    [{ ref: { kind: 'contentPage', id: 'privacy' } }, '/privacy-policy'],
    [{ ref: { kind: 'contentPage', id: 'faq' } }, '/info/faq'],
  ])('turns %j into %s', (link, address) => {
    expect(hrefsOf(resolveLinks(pageWith(link), targets))).toEqual([address])
  })

  it('links a record at the slug it has NOW, not the one it had when the page was written', () => {
    const renamed: LinkTargets = { ...targets, slugs: { ...targets.slugs, product: new Map([[2, 'renamed']]) } }

    expect(hrefsOf(resolveLinks(pageWith({ ref: { kind: 'product', id: 2 } }), renamed))).toEqual(['/products/2/renamed'])
  })

  it.each([
    ['a product the store no longer has', { ref: { kind: 'product', id: 99 } }],
    ['a blog post that is gone', { ref: { kind: 'blogPost', id: 99 } }],
    ['a page that is not published', { ref: { kind: 'page', id: 'draft' } }],
    ['a content page that is not published', { ref: { kind: 'contentPage', id: 'secret' } }],
  ])('takes out a link to %s, so no call to action leads nowhere', (_, link) => {
    expect(hrefsOf(resolveLinks(pageWith(link, { route: '/offers' }), targets))).toEqual([undefined, '/offers'])
  })

  it('does not change the document it is given', () => {
    const document = pageWith({ ref: { kind: 'product', id: 2 } })
    const before = JSON.stringify(document)

    resolveLinks(document, targets)

    expect(JSON.stringify(document)).toBe(before)
  })
})
