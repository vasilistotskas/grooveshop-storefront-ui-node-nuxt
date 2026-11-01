import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/builder/catalogue.get'
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
    expect(response.body.blocks.map((block: { type: string }) => block.type)).toEqual(['promo_banner', 'promo_item'])
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

  it('states what a page and a template carry at their root, beside the blocks', async () => {
    const response = await get()

    expect(Object.keys(response.body.documentKinds)).toEqual(['page', 'template'])
    expect(response.body.documentKinds.page.translatable).toEqual(['/seoTitle', '/seoDescription', '/seoKeywords'])
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
    expect(response.body.blocks).toHaveLength(2)
  })

  describe('?schema', () => {
    it('is accepted for a design and gives its blocks: every design has them all', async () => {
      const [plain, webside, unknown] = await Promise.all([get(), get({}, 'webside'), get({}, 'no_such_design')])

      expect(webside.status).toBe(200)
      expect(webside.body).toEqual(plain.body)
      expect(unknown.body).toEqual(plain.body)
      expect(webside.headers.get('etag')).toBe(plain.headers.get('etag'))
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
    expect(response.body).toEqual({ hash: expect.stringMatching(/^[0-9a-f]{16}$/), blocks: [], documentKinds: expect.any(Object) })
    expect(response.headers.get('etag')).toBe(`"${response.body.hash}"`)
  })
})
