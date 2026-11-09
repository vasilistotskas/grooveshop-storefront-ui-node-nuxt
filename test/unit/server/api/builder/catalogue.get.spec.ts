import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/builder/catalogue.get'
import * as z from 'zod'
import { callRoute } from '~~/test/helpers/nitro'

const get = (headers: Record<string, string> = {}, schema?: string, route = handler) => callRoute(route, {
  route: '/api/builder/catalogue',
  url: schema === undefined ? undefined : `/api/builder/catalogue?schema=${schema}`,
  headers,
})

afterEach(() => {
  vi.doUnmock('#builder-blocks')
  vi.resetModules()
})

describe('GET /api/builder/catalogue', () => {
  it('serves the blocks of the build with the hash of them', async () => {
    const response = await get()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.body.hash).toMatch(/^[0-9a-f]{16}$/)
    expect(response.body.blocks.map((block: { type: string }) => block.type)).toEqual(['promo_banner', 'promo_item', 'promo_picture', 'promo_rail'])
    expect(response.body.blocks[0]).toMatchObject({
      type: 'promo_banner',
      version: 2,
      accepts: [2],
      translatable: ['/title', '/note/text'],
      refs: { '/productId': 'product' },
      kinds: ['section'],
      schema: { type: 'object', additionalProperties: false },
    })
  })

  it('states what a page, a template and the theme carry at their root, beside the blocks', async () => {
    const response = await get()

    expect(Object.keys(response.body.documentKinds)).toEqual(['page', 'template', 'theme'])
    expect(response.body.documentKinds.page.translatable).toEqual(['/seoTitle', '/seoDescription', '/seoKeywords', '/heading'])
  })

  it('is the same for every store and needs no tenant: it asks nothing of the request', async () => {
    const one = await get({ host: 'store-a.test' })
    const other = await get({ 'host': 'store-b.test', 'x-forwarded-host': 'evil.example' })

    expect(other.body).toEqual(one.body)
  })

  it('is public and revalidates by the content hash, so a client holds it until the next build', async () => {
    const first = await get()
    const etag = first.headers.get('etag')

    expect(first.headers.get('cache-control')).toBe('public, no-cache')
    expect(etag).toBe(`"${first.body.hash}"`)

    const revalidated = await get({ 'if-none-match': etag! })

    expect(revalidated.status).toBe(304)
    expect(revalidated.body).toBeUndefined()
    expect(revalidated.headers.get('etag')).toBe(etag)
  })

  it('serves the whole catalogue again for another hash', async () => {
    const response = await get({ 'if-none-match': '"0000000000000000"' })

    expect(response.status).toBe(200)
    expect(response.body.blocks).toHaveLength(4)
  })

  describe('?schema', () => {
    it('gives a design the blocks and page types every design has and those of its own, not another design', async () => {
      vi.resetModules()
      const { defineBlock } = await import('~~/shared/builder/defineBlock')
      const { promoBanner, promoItem } = await import('~~/test/fixtures/builder/blocks')
      const only = (type: string, design: string) => defineBlock({ type, version: 1, kinds: ['section'], designs: [design], schema: z.object({}) })
      vi.doMock('#builder-blocks', () => ({ default: [promoBanner, promoItem, only('about_content', 'webside'), only('partner_strip', 'fyteia')] }))
      const { default: designHandler } = await import('~~/server/api/builder/catalogue.get')
      const types = (response: { body: { blocks: Array<{ type: string }> } }) => response.body.blocks.map(block => block.type)

      const [plain, webside, fyteia, unknown] = await Promise.all([get({}, undefined, designHandler), get({}, 'webside', designHandler), get({}, 'fyteia', designHandler), get({}, 'no_such_design', designHandler)])

      expect(types(plain)).toEqual(['about_content', 'partner_strip', 'promo_banner', 'promo_item'])
      expect(types(webside)).toEqual(['about_content', 'promo_banner', 'promo_item'])
      expect(types(fyteia)).toEqual(['partner_strip', 'promo_banner', 'promo_item'])
      expect(types(unknown)).toEqual(['promo_banner', 'promo_item'])
      expect(plain.body.blocks[0]).toMatchObject({ type: 'about_content', designs: ['webside'] })
      expect(webside.body.templates).toContain('why-microlearning')
      expect(fyteia.body.templates).not.toContain('why-microlearning')
      expect(fyteia.body.templates).toContain('about')
      expect(new Set([plain, webside, fyteia, unknown].map(response => response.headers.get('etag'))).size).toBe(4)
    })

    it('answers a design the same every time, with its own hash for the ETag', async () => {
      const first = await get({}, 'webside')
      const again = await get({ 'if-none-match': first.headers.get('etag')! }, 'webside')

      expect(first.status).toBe(200)
      expect(first.headers.get('etag')).toBe(`"${first.body.hash}"`)
      expect(again.status).toBe(304)
    })

    it.each(['bad-name', '1abc', 'a'.repeat(64)])('refuses %j: a schema is an identifier', async (schema) => {
      expect((await get({}, schema)).status).toBe(400)
    })
  })

  it('works with no block defined: an empty catalogue, which Django answers by refusing every save', async () => {
    vi.resetModules()
    vi.doMock('#builder-blocks', () => ({ default: [] }))
    const { default: emptyHandler } = await import('~~/server/api/builder/catalogue.get')

    const response = await get({}, undefined, emptyHandler)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ hash: expect.stringMatching(/^[0-9a-f]{16}$/), blocks: [], dataLimits: { maxPickedIds: 24, maxFilterIds: 5, maxQueryLimit: 24, maxQueriesPerDocument: 12 }, documentKinds: expect.any(Object), templates: expect.any(Array) })
    expect(response.headers.get('etag')).toBe(`"${response.body.hash}"`)
  })
})
