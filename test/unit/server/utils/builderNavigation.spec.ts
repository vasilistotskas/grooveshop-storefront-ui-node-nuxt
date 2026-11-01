import { describe, expect, it } from 'vitest'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import { parseDocument } from '~~/server/utils/builderDocument'
import { navigationItems } from '~~/server/utils/builderNavigation'
import type { NavigationTargets } from '~~/server/utils/builderNavigation'
import { convertLegacyMenu } from '~~/shared/builder/fromLegacyMenu'
import type { LegacyMenu } from '~~/shared/builder/fromLegacyMenu'
import type { BlockDefinition, BuilderDocument } from '~~/shared/types/builder'
import header from '~~/test/fixtures/builder/legacy/menu-header.json'
import footer from '~~/test/fixtures/builder/legacy/menu-footer.json'

/**
 * The menus a group document gives the chrome. The shape is what `useNavigation`
 * reads today; the rule that is new in the builder is that a link to a page
 * that is not in the current release is HIDDEN when the menu renders (the
 * document keeps it), and a footer column left with no visible link goes too.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const registry = new Map(definitions.map(block => [block.type, block]))

const everything: NavigationTargets = { pages: new Set(['about']), contentPages: new Set(['terms', 'privacy', 'faq']) }
const nothing: NavigationTargets = { pages: new Set(), contentPages: new Set() }

const parsed = (response: { document: unknown }): BuilderDocument => parseDocument(response.document, 'group', registry)

describe('navigationItems', () => {
  it('gives the header the links the chrome renders: a path as `to`, an external URL as `href`, the icon when there is one', () => {
    expect(navigationItems(parsed(header.response), everything, registry)).toEqual({
      header: [
        { label: 'Προϊόντα', to: '/products' },
        { label: 'Σχετικά', to: '/about', icon: 'i-lucide-info' },
        { label: 'Όροι χρήσης', to: '/terms-of-use' },
        { label: 'Blog μας', href: 'https://blog.example.com' },
      ],
    })
  })

  it('sends a content page through its legal route, and any other to /info/<slug>', () => {
    const menu: LegacyMenu = { slot: 'header', links: [
      { labels: { el: 'Όροι' }, target: { type: 'content_page', slug: 'terms' } },
      { labels: { el: 'Συχνές' }, target: { type: 'content_page', slug: 'faq' } },
    ] }
    const { document } = convertLegacyMenu(menu, { defaultLocale: 'el', registry })

    expect(navigationItems(parsed({ document }), everything, registry).header?.map(link => link.to)).toEqual(['/terms-of-use', '/info/faq'])
  })

  it('sends a page type a static route renders to that route', () => {
    const menu: LegacyMenu = { slot: 'header', links: [
      { labels: { el: 'Αρχική' }, target: { type: 'page_layout', pageType: 'home' } },
      { labels: { el: 'Επικοινωνία' }, target: { type: 'page_layout', pageType: 'contact' } },
      { labels: { el: 'Προσφορά' }, target: { type: 'page_layout', pageType: 'summer-sale' } },
    ] }
    const { document } = convertLegacyMenu(menu, { defaultLocale: 'el', registry })
    const targets = { pages: new Set(['home', 'contact', 'summer-sale']), contentPages: new Set<string>() }

    expect(navigationItems(parsed({ document }), targets, registry).header?.map(link => link.to)).toEqual(['/', '/contact', '/summer-sale'])
  })

  it('hides a link to a page or content page that is not published, and keeps the rest', () => {
    expect(navigationItems(parsed(header.response), nothing, registry).header).toEqual([
      { label: 'Προϊόντα', to: '/products' },
      { label: 'Blog μας', href: 'https://blog.example.com' },
    ])
  })

  it('gives the footer its columns with their links', () => {
    expect(navigationItems(parsed(footer.response), everything, registry)).toEqual({
      footer: [
        { label: 'Εταιρεία', icon: 'i-lucide-building', children: [{ label: 'Σχετικά', to: '/about' }, { label: 'Απόρρητο', to: '/privacy-policy' }] },
        { label: 'Στοιχεία', showsMerchantIdentity: true, children: [{ label: 'Επικοινωνία', to: '/contact' }] },
      ],
    })
  })

  it('drops a footer column left with no visible link, instead of a bare heading', () => {
    const items = navigationItems(parsed(footer.response), { pages: new Set(), contentPages: new Set() }, registry)

    expect(items.footer).toEqual([{ label: 'Στοιχεία', showsMerchantIdentity: true, children: [{ label: 'Επικοινωνία', to: '/contact' }] }])
  })

  it('has no footer entry at all when no column is left, which the chrome reads as its built-in menu being used', () => {
    const menu: LegacyMenu = { slot: 'footer', columns: [{ labels: { el: 'Μόνο σελίδα' }, links: [{ labels: { el: 'Σχετικά' }, target: { type: 'page_layout', pageType: 'about' } }] }] }
    const { document } = convertLegacyMenu(menu, { defaultLocale: 'el', registry })

    expect(navigationItems(parsed({ document }), nothing, registry)).toEqual({ footer: [] })
  })

  it('leaves out a disabled link and a disabled menu', () => {
    const document = structuredClone(parsed(header.response))
    const section = document.sections[document.order[0]!]!
    section.blocks![section.blockOrder![0]!]!.disabled = true

    expect(navigationItems(document, everything, registry).header?.[0]).toEqual({ label: 'Σχετικά', to: '/about', icon: 'i-lucide-info' })

    section.disabled = true
    expect(navigationItems(document, everything, registry)).toEqual({})
  })
})

describe('the nav_link block', () => {
  const link = buildBlockCatalogue(definitions).blocks.find(block => block.type === 'nav_link')!

  it('states in the catalogue that a link has exactly one target, for Django', () => {
    expect(link.schema.oneOf).toEqual([{ required: ['page'] }, { required: ['contentPage'] }, { required: ['route'] }, { required: ['href'] }])
  })

  it('names the pages it points at as references Django checks', () => {
    expect(link.refs).toEqual({ '/page': 'page', '/contentPage': 'contentPage' })
    expect(link.translatable).toEqual(['/label'])
  })

  it.each([
    ['no target', { label: 'x' }],
    ['two targets', { label: 'x', page: 'about', route: '/blog' }],
    ['a route that is not built in', { label: 'x', route: '/cart' }],
    ['an http URL', { label: 'x', href: 'http://example.com' }],
    ['an empty label', { label: '', route: '/blog' }],
  ])('is refused with %s', (_, settings) => {
    expect(registry.get('nav_link')!.schema.safeParse(settings).success).toBe(false)
  })
})

describe('converting a menu', () => {
  const convert = (menu: LegacyMenu) => () => convertLegacyMenu(menu, { defaultLocale: 'el', registry })

  it('refuses a link with no label in the default language, naming where', () => {
    expect(convert({ slot: 'header', links: [{ id: 'a', labels: { en: 'About' }, target: { type: 'route', route: '/blog' } }] }))
      .toThrow(expect.objectContaining({ errors: [expect.objectContaining({ path: '/sections/header_menu/blocks/a/settings', code: 'invalid_settings' })] }))
  })

  it('refuses a route that is not one of the built-in ones', () => {
    expect(convert({ slot: 'header', links: [{ labels: { el: 'Καλάθι' }, target: { type: 'route', route: '/cart' } }] }))
      .toThrow(expect.objectContaining({ errors: [expect.objectContaining({ code: 'invalid_settings' })] }))
  })

  it('is deterministic', () => {
    const menu: LegacyMenu = { slot: 'footer', columns: [{ labels: { el: 'Α', en: 'A' }, links: [{ labels: { el: 'Β' }, target: { type: 'route', route: '/' } }] }] }

    expect(JSON.stringify(convert(menu)())).toBe(JSON.stringify(convert(menu)()))
  })
})
