import { describe, expect, it } from 'vitest'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import { parseDocument } from '~~/server/utils/builderDocument'
import { navigationItems } from '~~/server/utils/builderNavigation'
import type { PublishedTargets } from '~~/server/utils/builderNavigation'
import type { BlockDefinition, BuilderDocument } from '~~/shared/types/builder'

/**
 * The menus a group document gives the chrome. The shape is what `useNavigation`
 * reads; a link to a page that is not in the current release is HIDDEN when the
 * menu renders (the document keeps it), and a footer column left with no
 * visible link goes too.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const registry = new Map(definitions.map(block => [block.type, block]))

const everything: PublishedTargets = { pages: new Set(['about']), contentPages: new Set(['terms', 'privacy', 'faq']) }
const nothing: PublishedTargets = { pages: new Set(), contentPages: new Set() }

interface TestNode { type: string, settings: Record<string, unknown>, blocks?: Record<string, TestNode>, blockOrder?: string[] }
const node = (type: string, settings: Record<string, unknown>, children: Record<string, TestNode> = {}): TestNode => ({
  type: `${type}@1`,
  settings,
  ...(Object.keys(children).length > 0 && { blocks: children, blockOrder: Object.keys(children) }),
})
/** A group document holding one menu section, parsed against the real blocks as the route parses it. */
const menu = (section: TestNode): BuilderDocument => parseDocument({ sections: { menu: section }, order: ['menu'] }, 'group', registry)
const link = (settings: Record<string, unknown>) => node('nav_link', settings)

const header = () => menu(node('header_menu', {}, {
  products: link({ label: 'Προϊόντα', route: '/products' }),
  about: link({ label: 'Σχετικά', icon: 'i-lucide-info', page: 'about' }),
  terms: link({ label: 'Όροι χρήσης', contentPage: 'terms' }),
  blog: link({ label: 'Blog μας', href: 'https://blog.example.com' }),
}))

const footer = () => menu(node('footer_menu', {}, {
  company: node('footer_column', { label: 'Εταιρεία', icon: 'i-lucide-building' }, {
    about: link({ label: 'Σχετικά', page: 'about' }),
    privacy: link({ label: 'Απόρρητο', contentPage: 'privacy' }),
  }),
  details: node('footer_column', { label: 'Στοιχεία', showsMerchantIdentity: true }, {
    contact: link({ label: 'Επικοινωνία', route: '/contact' }),
  }),
}))

describe('navigationItems', () => {
  it('gives the header the links the chrome renders: a path as `to`, an external URL as `href`, the icon when there is one', () => {
    expect(navigationItems(header(), everything, registry)).toEqual({
      header: [
        { label: 'Προϊόντα', to: '/products' },
        { label: 'Σχετικά', to: '/about', icon: 'i-lucide-info' },
        { label: 'Όροι χρήσης', to: '/terms-of-use' },
        { label: 'Blog μας', href: 'https://blog.example.com' },
      ],
    })
  })

  it('sends a content page through its legal route, and any other to /info/<slug>', () => {
    const document = menu(node('header_menu', {}, {
      terms: link({ label: 'Όροι', contentPage: 'terms' }),
      faq: link({ label: 'Συχνές', contentPage: 'faq' }),
    }))

    expect(navigationItems(document, everything, registry).header?.map(item => item.to)).toEqual(['/terms-of-use', '/info/faq'])
  })

  it('sends a page type a static route renders to that route', () => {
    const document = menu(node('header_menu', {}, {
      home: link({ label: 'Αρχική', page: 'home' }),
      contact: link({ label: 'Επικοινωνία', page: 'contact' }),
      sale: link({ label: 'Προσφορά', page: 'summer-sale' }),
    }))
    const targets = { pages: new Set(['home', 'contact', 'summer-sale']), contentPages: new Set<string>() }

    expect(navigationItems(document, targets, registry).header?.map(item => item.to)).toEqual(['/', '/contact', '/summer-sale'])
  })

  it('hides a link to a page or content page that is not published, and keeps the rest', () => {
    expect(navigationItems(header(), nothing, registry).header).toEqual([
      { label: 'Προϊόντα', to: '/products' },
      { label: 'Blog μας', href: 'https://blog.example.com' },
    ])
  })

  it('gives the footer its columns with their links', () => {
    expect(navigationItems(footer(), everything, registry)).toEqual({
      footer: [
        { label: 'Εταιρεία', icon: 'i-lucide-building', children: [{ label: 'Σχετικά', to: '/about' }, { label: 'Απόρρητο', to: '/privacy-policy' }] },
        { label: 'Στοιχεία', showsMerchantIdentity: true, children: [{ label: 'Επικοινωνία', to: '/contact' }] },
      ],
    })
  })

  it('drops a footer column left with no visible link, instead of a bare heading', () => {
    expect(navigationItems(footer(), nothing, registry).footer)
      .toEqual([{ label: 'Στοιχεία', showsMerchantIdentity: true, children: [{ label: 'Επικοινωνία', to: '/contact' }] }])
  })

  it('has no footer entry at all when no column is left, which the chrome reads as its built-in menu being used', () => {
    const document = menu(node('footer_menu', {}, {
      only: node('footer_column', { label: 'Μόνο σελίδα' }, { about: link({ label: 'Σχετικά', page: 'about' }) }),
    }))

    expect(navigationItems(document, nothing, registry)).toEqual({ footer: [] })
  })

  it('leaves out a disabled link and a disabled menu', () => {
    const document = header()
    const section = document.sections[document.order[0]!]!
    section.blocks![section.blockOrder![0]!]!.disabled = true

    expect(navigationItems(document, everything, registry).header?.[0]).toEqual({ label: 'Σχετικά', to: '/about', icon: 'i-lucide-info' })

    section.disabled = true
    expect(navigationItems(document, everything, registry)).toEqual({})
  })
})

describe('the nav_link block', () => {
  const definition = buildBlockCatalogue(definitions).blocks.find(block => block.type === 'nav_link')!

  it('states in the catalogue that a link has exactly one target, for Django', () => {
    expect(definition.schema.oneOf).toEqual([{ required: ['page'] }, { required: ['contentPage'] }, { required: ['route'] }, { required: ['href'] }])
  })

  it('names the pages it points at as references Django checks', () => {
    expect(definition.refs).toEqual({ '/page': 'page', '/contentPage': 'contentPage' })
    expect(definition.translatable).toEqual(['/label'])
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
