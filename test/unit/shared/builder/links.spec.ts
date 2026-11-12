import { describe, expect, it } from 'vitest'
import { collectLinkRefs, resolveLinks } from '~~/shared/builder/links'
import { fixtureBlocks } from '~~/test/fixtures/builder/blocks'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { blockedFeaturePaths } from '~~/shared/utils/gatedRoutes'
import type { BlockDefinition, BuilderDocument, LinkTargets } from '~~/shared/types/builder'

const registry = new Map<string, BlockDefinition>(fixtureBlocks.map(block => [block.type, block]))

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
  published: { pages: new Set(['about', 'blog', 'products']), contentPages: new Set(['privacy', 'faq']) },
  blocked: new Set(),
}

/** The targets of a store with `features` switched off, its blocked paths from the gated routes' table. */
const withOff = (...off: Array<'blog' | 'catalogue' | 'promotions'>): LinkTargets => {
  const store = validTenantConfig('shop.test')
  return { ...targets, blocked: blockedFeaturePaths({ features: { ...store.features, blog: true, promotions: true, ...Object.fromEntries(off.map(feature => [feature, false])) } }) }
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

    expect(collectLinkRefs(document, registry)).toEqual([{ kind: 'product', id: 2 }, { kind: 'page', id: 'about' }])
  })

  it('finds nothing in a document with no link, or whose link setting is absent', () => {
    expect(collectLinkRefs(pageWith(undefined), registry)).toEqual([])
    expect(collectLinkRefs({ sections: {}, order: [] }, registry)).toEqual([])
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
    expect(hrefsOf(resolveLinks(pageWith(link), targets, registry))).toEqual([address])
  })

  it('links a record at the slug it has NOW, not the one it had when the page was written', () => {
    const renamed: LinkTargets = { ...targets, slugs: { ...targets.slugs, product: new Map([[2, 'renamed']]) } }

    expect(hrefsOf(resolveLinks(pageWith({ ref: { kind: 'product', id: 2 } }), renamed, registry))).toEqual(['/products/2/renamed'])
  })

  it.each([
    ['a product the store no longer has', { ref: { kind: 'product', id: 99 } }],
    ['a blog post that is gone', { ref: { kind: 'blogPost', id: 99 } }],
    ['a page that is not published', { ref: { kind: 'page', id: 'draft' } }],
    ['a content page that is not published', { ref: { kind: 'contentPage', id: 'secret' } }],
  ])('takes out a link to %s, so no call to action leads nowhere', (_, link) => {
    expect(hrefsOf(resolveLinks(pageWith(link, { route: '/offers' }), targets, registry))).toEqual([undefined, '/offers'])
  })

  // A link to a page a switched-off store feature takes away is a 404 the
  // store would advertise: it goes, as a link to a record that is gone does.
  it.each([
    ['blog', { route: '/blog' }],
    ['blog', { ref: { kind: 'blogPost', id: 4 } }],
    ['blog', { ref: { kind: 'blogCategory', id: 5 } }],
    // The store's own blog page, built in the editor: published, yet `/blog`.
    ['blog', { ref: { kind: 'page', id: 'blog' } }],
    ['catalogue', { ref: { kind: 'page', id: 'products' } }],
    ['catalogue', { route: '/products' }],
    ['catalogue', { ref: { kind: 'product', id: 2 } }],
    ['catalogue', { ref: { kind: 'category', id: 3 } }],
    ['promotions', { route: '/offers' }],
  ] as const)('takes out a link behind the %s feature when the store has it off: %j', (off, link) => {
    expect(hrefsOf(resolveLinks(pageWith(link, { href: 'https://example.com/a' }), withOff(off), registry))).toEqual([undefined, 'https://example.com/a'])
  })

  it('keeps every link of a store that has the features on, and the links another feature does not gate', () => {
    const links = [{ route: '/blog' }, { ref: { kind: 'product', id: 2 } }, { route: '/contact' }, { ref: { kind: 'page', id: 'about' } }]

    expect(hrefsOf(resolveLinks(pageWith(...links), withOff(), registry))).toEqual(['/blog', '/products/2/mini-powerbank', '/contact', '/about'])
    expect(hrefsOf(resolveLinks(pageWith(...links), withOff('blog'), registry))).toEqual([undefined, '/products/2/mini-powerbank', '/contact', '/about'])
  })

  it('does not change the document it is given', () => {
    const document = pageWith({ ref: { kind: 'product', id: 2 } })
    const before = JSON.stringify(document)

    resolveLinks(document, targets, registry)

    expect(JSON.stringify(document)).toBe(before)
  })
})
