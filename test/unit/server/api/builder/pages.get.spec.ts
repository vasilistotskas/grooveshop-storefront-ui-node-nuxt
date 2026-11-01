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
