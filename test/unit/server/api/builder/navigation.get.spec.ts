import { describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/builder/navigation.get'
import type { BlockDefinition } from '~~/shared/types/builder'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse, log } from '~~/test/helpers/nitro'

/**
 * The chrome's menus. They need the menu blocks, which the unit project's
 * fixture set does not have, so the REAL blocks stand in for `#builder-blocks`
 * (the way `builderPortFixtures.spec.ts` reads them).
 */
vi.mock('#builder-blocks', async () => ({
  default: (await Promise.all(Object.values(import.meta.glob<{ default: BlockDefinition }>('../../../../../app/blocks/*.block.ts')).map(load => load())))
    .map(({ default: block }) => block),
}))

const route = '/api/builder/navigation'
const API = 'http://backend.test/api/v1'

interface TestNode { type: string, settings: Record<string, unknown>, blocks?: Record<string, TestNode>, blockOrder?: string[] }
const node = (type: string, settings: Record<string, unknown>, children: Record<string, TestNode> = {}): TestNode => ({
  type: `${type}@1`,
  settings,
  ...(Object.keys(children).length > 0 && { blocks: children, blockOrder: Object.keys(children) }),
})
const group = (key: string, section: TestNode) => ({ key: `group:${key}`, version: 1, sections: { menu: section }, order: ['menu'] })

const HEADER = group('header', node('header_menu', {}, {
  products: node('nav_link', { label: 'Προϊόντα', route: '/products' }),
  about: node('nav_link', { label: 'Σχετικά', page: 'about' }),
  terms: node('nav_link', { label: 'Όροι', contentPage: 'terms' }),
}))
const FOOTER = group('footer', node('footer_menu', {}, {
  company: node('footer_column', { label: 'Εταιρεία' }, { about: node('nav_link', { label: 'Σχετικά', page: 'about' }) }),
  shop: node('footer_column', { label: 'Κατάστημα' }, { all: node('nav_link', { label: 'Όλα', route: '/products' }) }),
}))

function serve(options: { groups?: Record<string, unknown>, pages?: string[], contentPages?: string[] | 'down' } = {}) {
  const { groups = { header: HEADER, footer: FOOTER }, pages = ['about'], contentPages = ['terms'] } = options
  backend.reply(({ path }) => {
    if (path.endsWith('/builder/published')) {
      return { release: 4, groups, pages: pages.map(key => ({ key, kind: 'template', updatedAt: '2026-11-01T10:00:00Z' })) }
    }
    if (path.endsWith('/content-page')) {
      return contentPages === 'down'
        ? jsonResponse({ detail: 'down' }, 503)
        : { results: contentPages.map(slug => ({ slug, translatedLocales: ['el'] })) }
    }
    throw new Error(`unexpected backend request: ${path}`)
  })
}

const get = (locale = 'el') => callRoute(handler, { route, context: { locale }, headers: { 'x-forwarded-host': 'evil.example' } })

describe('GET /api/builder/navigation', () => {
  it('answers the release menus as the links and columns the chrome reads', async () => {
    serve()

    const response = await get()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      header: [
        { label: 'Προϊόντα', to: '/products' },
        { label: 'Σχετικά', to: '/about' },
        { label: 'Όροι', to: '/terms-of-use' },
      ],
      footer: [
        { label: 'Εταιρεία', children: [{ label: 'Σχετικά', to: '/about' }] },
        { label: 'Κατάστημα', children: [{ label: 'Όλα', to: '/products' }] },
      ],
    })
  })

  it('asks as the store, in the page locale, and reads the published content pages of the store', async () => {
    serve()

    await get('en')

    const published = backend.requests.find(request => request.path === `${API}/builder/published`)!
    expect(published.query).toEqual({ locale: 'en' })
    expect(published.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(backend.requests.some(request => request.path === `${API}/content-page`)).toBe(true)
  })

  it('hides a link to a page or content page the release does not have, and a footer column left empty', async () => {
    serve({ pages: [], contentPages: [] })

    const { body } = await get()

    expect(body.header).toEqual([{ label: 'Προϊόντα', to: '/products' }])
    expect(body.footer).toEqual([{ label: 'Κατάστημα', children: [{ label: 'Όλα', to: '/products' }] }])
  })

  it('has no key for a menu the store has not built, which the chrome reads as its built-in menu', async () => {
    serve({ groups: { header: HEADER } })

    const { body } = await get()

    expect(Object.keys(body)).toEqual(['header'])
  })

  it('answers an empty object for a release with no menu at all', async () => {
    serve({ groups: {} })

    expect((await get()).body).toEqual({})
  })

  it('leaves out a menu it cannot use and warns, instead of failing the chrome', async () => {
    serve({ groups: { header: group('header', node('no_such_menu', {})) } })

    const response = await get()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({})
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ tag: 'builder', reason: 'unknown_type' }))
  })

  it('fails instead of answering a menu that would hide the wrong links, when the content pages cannot be read', async () => {
    serve({ contentPages: 'down' })

    const response = await get()

    expect(response.status).toBeGreaterThanOrEqual(500)
  })

  it('lets a release read that fails through', async () => {
    backend.reply(jsonResponse({ detail: 'Internal server error.' }, 500))

    expect((await get()).status).toBeGreaterThanOrEqual(500)
  })

  describe('its cache', () => {
    it('is the handler named builderChrome, which the purge after a release names in Django', () => {
      expect(cacheOptionsOf(handler).name).toBe('builderChrome')
    })

    it('keys on the store, the language and the epoch', () => {
      const options = cacheOptionsOf(handler)
      const key = (host: string, locale: string) => options.getKey!(createTestEvent({ host, context: { locale } }))

      expect(key('a.test', 'el')).not.toBe(key('b.test', 'el'))
      expect(key('a.test', 'el')).not.toBe(key('a.test', 'en'))
    })
  })
})
