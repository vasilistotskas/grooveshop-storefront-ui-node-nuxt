import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/pages/[pageKey].get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse, log } from '~~/test/helpers/nitro'

const route = '/api/builder/pages/:pageKey'
const API = 'http://backend.test/api/v1'

const published = (page: unknown) => ({ release: 3, locale: 'el', theme: null, groups: {}, page })
const document = (overrides: Record<string, unknown> = {}) => ({
  key: 'page:about',
  version: 2,
  sections: {},
  order: [],
  ...overrides,
})

const get = (key = 'about', locale = 'el') => callRoute(handler, {
  route,
  url: `/api/builder/pages/${key}`,
  context: { locale },
  headers: { 'x-forwarded-host': 'evil.example' },
})

describe('GET /api/builder/pages/[pageKey]', () => {
  it('asks the store\'s backend for the page in the page locale', async () => {
    backend.reply(published(document()))

    await get('about', 'en')

    expect(backend.lastRequest.path).toBe(`${API}/builder/published/about`)
    expect(backend.lastRequest.query).toEqual({ locale: 'en' })
    // A release is per-tenant data: the call must name the store.
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers each section as its block type and the props its component gets, in the page\'s order', async () => {
    backend.reply(published(document({
      sections: {
        b: { type: 'promo_banner@2', settings: { title: 'Sale', tone: 'accent' }, blocks: { x: { type: 'promo_item@1', settings: { label: 'One' } } }, blockOrder: ['x'] },
        a: { type: 'promo_banner@2', settings: { title: 'Plain' } },
      },
      order: ['b', 'a'],
    })))

    const response = await get()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      page: {
        sections: [
          { id: 'b', componentType: 'promo_banner', props: { title: 'Sale', tone: 'accent', items: [{ label: 'One' }] } },
          { id: 'a', componentType: 'promo_banner', props: { title: 'Plain', tone: 'info' } },
        ],
      },
    })
  })

  it('brings an older block version up to the current one, and strips what the schema does not know', async () => {
    backend.reply(published(document({
      sections: { a: { type: 'promo_banner@1', settings: { heading: 'Old name', onclick: 'x()' } } },
      order: ['a'],
    })))

    const { body } = await get()

    expect(body.page.sections).toEqual([{ id: 'a', componentType: 'promo_banner', props: { title: 'Old name', tone: 'info' } }])
  })

  it('carries the page\'s own settings: its SEO copy in the page\'s language', async () => {
    backend.reply(published(document({ settings: { seoTitle: 'About us', seoDescription: 'Who we are.', onclick: 'x()' } })))

    const { body } = await get()

    expect(body.page.settings).toEqual({ seoTitle: 'About us', seoDescription: 'Who we are.' })
  })

  describe('its links', () => {
    const withLinks = (...links: unknown[]) => published(document({
      sections: {
        a: {
          type: 'promo_banner@2',
          settings: { title: 'Sale' },
          blocks: Object.fromEntries(links.map((href, index) => [`i${index}`, { type: 'promo_item@1', settings: { label: `Item ${index}`, href } }])),
          blockOrder: links.map((_, index) => `i${index}`),
        },
      },
      order: ['a'],
    }))
    const itemHrefs = (body: { page: { sections: { props: { items: { href?: string }[] } }[] } }) => body.page.sections[0]!.props.items.map(item => item.href)

    /** Django as the page handler meets it: the page, the slugs of records, the release and the content pages. */
    const store = (page: unknown, slugs: Record<string, Record<string, unknown>> = {}) => backend.reply(({ path }) => {
      if (path.endsWith('/builder/link-targets')) return slugs
      if (path.endsWith('/builder/published')) return { release: 3, locale: 'el', theme: null, groups: {}, pages: [{ key: 'about', kind: 'template', updatedAt: '2026-11-01T10:00:00Z' }] }
      if (path.endsWith('/content-page')) return { results: [{ slug: 'faq', translatedLocales: ['el'] }] }
      return page
    })

    it('answers each as the address it has now, in the props its component gets', async () => {
      store(withLinks(
        { href: 'https://example.com/a' },
        { route: '/offers' },
        { ref: { kind: 'product', id: 2 } },
        { ref: { kind: 'blogCategory', id: 5 } },
        { ref: { kind: 'page', id: 'about' } },
        { ref: { kind: 'contentPage', id: 'faq' } },
      ), { product: { 2: 'renamed' }, blogCategory: { 5: 'news' } })

      const { status, body } = await get()

      expect(status).toBe(200)
      expect(itemHrefs(body)).toEqual([
        'https://example.com/a',
        '/offers',
        '/products/2/renamed',
        '/blog/category/5/news',
        '/about',
        '/info/faq',
      ])
    })

    it('asks Django for the slugs of every record in ONE call, which carries no language', async () => {
      store(withLinks({ ref: { kind: 'product', id: 2 } }, { ref: { kind: 'product', id: 7 } }, { ref: { kind: 'category', id: 3 } }, { ref: { kind: 'product', id: 2 } }), { product: { 2: 'a', 7: 'b' }, category: { 3: 'c' } })

      await get('about', 'en')

      const calls = backend.requests.filter(({ path }) => path.endsWith('/builder/link-targets'))
      expect(calls).toHaveLength(1)
      expect(calls[0]!.query).toEqual({ product: '2,7', category: '3' })
      expect(calls[0]!.headers.get('x-forwarded-host')).toBe('shop.test')
    })

    it('makes one call per hundred ids of a kind, as Django answers no more', async () => {
      const ids = Array.from({ length: 101 }, (_, index) => index + 1)
      store(withLinks(...ids.map(id => ({ ref: { kind: 'product', id } }))), { product: { 1: 'a' } })

      await get()

      const calls = backend.requests.filter(({ path }) => path.endsWith('/builder/link-targets'))
      expect(calls.map(call => call.query.product!.split(',').length).sort((a, b) => a - b)).toEqual([1, 100])
    })

    it('reads the release only when a link names a page or a content page, and makes no call for links that name no record', async () => {
      store(withLinks({ route: '/offers' }, { href: 'https://example.com' }))

      await get()

      expect(backend.requests.map(({ path }) => path.replace(API, ''))).toEqual(['/builder/published/about'])
    })

    it('leaves out a link to a record Django no longer has, and keeps the rest', async () => {
      store(withLinks({ ref: { kind: 'product', id: 2 } }, { route: '/offers' }), { product: {} })

      const { status, body } = await get()

      expect(status).toBe(200)
      expect(itemHrefs(body)).toEqual([undefined, '/offers'])
    })

    it('fails the page, instead of answering it without links, when the slugs cannot be read', async () => {
      backend.reply(({ path }) => path.endsWith('/builder/link-targets') ? jsonResponse({ detail: 'Internal server error.' }, 500) : withLinks({ ref: { kind: 'product', id: 2 } }))

      expect((await get()).status).toBeGreaterThanOrEqual(500)
    })

    it('refuses an answer for the slugs that is not what Django sends', async () => {
      store(withLinks({ ref: { kind: 'product', id: 2 } }), { product: { 2: 5 } })

      expect((await get()).status).toBe(422)
    })
  })

  it('leaves out a section it cannot use and warns, instead of failing the page', async () => {
    backend.reply(published(document({
      sections: {
        good: { type: 'promo_banner@2', settings: { title: 'Fine' } },
        bad: { type: 'no_such_block@1', settings: {} },
      },
      order: ['good', 'bad'],
    })))

    const { status, body } = await get()

    expect(status).toBe(200)
    expect(body.page.sections.map((section: { id: string }) => section.id)).toEqual(['good'])
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ tag: 'builder', node: 'bad', reason: 'unknown_type' }))
  })

  it('answers { page: null } for Django\'s page_not_published, which is a normal state and not logged', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.', code: 'page_not_published' }, 404))

    const response = await get('products')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ page: null })
    expect(log.warn).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })

  it('does not mistake another 404 for an unbuilt page', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.', code: 'not_found' }, 404))

    const response = await get()

    expect(response.status).toBe(404)
    expect(response.body).not.toEqual({ page: null })
  })

  it('lets an outage through, so a page that cannot be fetched is not taken for one that does not exist', async () => {
    backend.reply(jsonResponse({ detail: 'Internal server error.' }, 500))

    const response = await get()

    expect(response.status).toBeGreaterThanOrEqual(500)
  })

  it('refuses an answer that is not the published read', async () => {
    backend.reply({ nope: true })

    expect((await get()).status).toBe(422)
  })

  it.each(['a b', 'a.b', 'x'.repeat(65)])('refuses the page key %j before it asks Django', async (key) => {
    const response = await get(key)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(0)
  })

  describe('its cache', () => {
    it('is the handler named builderPage, which Django\'s purge after a release names', () => {
      expect(cacheOptionsOf(handler).name).toBe('builderPage')
    })

    it('keys on the page, besides the store, the language and the epoch', () => {
      const options = cacheOptionsOf(handler)
      const key = (pageKey: string) => options.getKey!(createTestEvent({ context: { locale: 'el', params: { pageKey } } }))

      expect(key('about')).not.toBe(key('contact'))
    })
  })
})
