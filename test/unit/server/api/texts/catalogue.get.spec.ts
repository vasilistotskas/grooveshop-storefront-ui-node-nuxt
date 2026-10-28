import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/texts/catalogue.get'
import { callRoute } from '~~/test/helpers/nitro'

const get = (headers: Record<string, string> = {}, schema?: string) => callRoute(handler, {
  route: '/api/texts/catalogue',
  url: schema === undefined ? undefined : `/api/texts/catalogue?schema=${schema}`,
  headers,
})
const namespacesOf = (body: { entries: Array<{ namespace: string }> }) => [...new Set(body.entries.map(({ namespace }) => namespace))]

describe('GET /api/texts/catalogue', () => {
  it('serves the catalogue of the build: locales, hash and every entry with its defaults, shape and lock', async () => {
    const response = await get()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.body.locales).toEqual(['el', 'en'])
    expect(response.body.hash).toMatch(/^[0-9a-f]{16}$/)
    expect(response.body.entries).toContainEqual({
      namespace: 'components/Demo/Greeting',
      key: 'welcome',
      defaults: { el: 'Γεια σου {name}', en: 'Hello {name}' },
      placeholders: {
        el: { params: ['named:name'], pluralCases: 1 },
        en: { params: ['named:name'], pluralCases: 1 },
      },
      locked: false,
    })
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
  })

  it('serves the full catalogue again for another hash', async () => {
    const response = await get({ 'if-none-match': '"0000000000000000"' })

    expect(response.status).toBe(200)
    expect(response.body.entries.length).toBeGreaterThan(0)
  })

  describe('?schema', () => {
    it('lists only what that store renders, plus global', async () => {
      const webside = await get({}, 'webside')

      expect(webside.status).toBe(200)
      expect(namespacesOf(webside.body)).toEqual([
        'components/Cookie/Modal',
        'components/Demo/Greeting',
        'components/PageSection/Hero',
        'components/variants/webside/Chrome/Footer',
        'components/variants/webside/Product/PriorPrice',
        'components/variants/webside/Storefront/Home',
        'global',
      ])
    })

    it('gives a store with a section variant its own section and not the base one', async () => {
      expect(namespacesOf((await get({}, 'delta_sigma')).body)).toEqual([
        'components/Chrome/Footer',
        'components/Cookie/Modal',
        'components/Demo/Greeting',
        'components/PageSection/variants/delta_sigma/Hero',
        'components/Product/PriorPrice',
        'components/Storefront/Home',
        'global',
      ])
    })

    it('gives a schema with no design of its own, or one the build has never heard of, the default set', async () => {
      const expected = [
        'components/Chrome/Footer',
        'components/Cookie/Modal',
        'components/Demo/Greeting',
        'components/PageSection/Hero',
        'components/Product/PriorPrice',
        'components/Storefront/Home',
        'global',
      ]

      expect(namespacesOf((await get({}, 'acme')).body)).toEqual(expected)
      expect(namespacesOf((await get({}, 'default')).body)).toEqual(expected)
    })

    it('lists every tree without it', async () => {
      const namespaces = namespacesOf((await get()).body)

      expect(namespaces).toContain('components/variants/webside/Chrome/Footer')
      expect(namespaces).toContain('components/PageSection/variants/delta_sigma/Hero')
      expect(namespaces).toContain('components/Chrome/Footer')
    })

    it('keeps the entries themselves and gives each view its own hash', async () => {
      const full = await get()
      const webside = await get({}, 'webside')
      const other = await get({}, 'acme')

      expect(webside.body.locales).toEqual(full.body.locales)
      expect(webside.body.entries.filter(({ namespace }: { namespace: string }) => namespace === 'components/Demo/Greeting'))
        .toEqual(full.body.entries.filter(({ namespace }: { namespace: string }) => namespace === 'components/Demo/Greeting'))
      expect(new Set([full.body.hash, webside.body.hash, other.body.hash]).size).toBe(3)
    })

    it('varies the ETag by view: a view revalidates by its own hash only', async () => {
      const webside = await get({}, 'webside')
      const etag = webside.headers.get('etag')

      expect(etag).toBe(`"${webside.body.hash}"`)
      expect((await get({ 'if-none-match': etag! }, 'webside')).status).toBe(304)
      expect((await get({ 'if-none-match': etag! }, 'acme')).status).toBe(200)
      expect((await get({ 'if-none-match': etag! })).status).toBe(200)
    })

    it('rejects a schema that is not an identifier', async () => {
      expect((await get({}, 'web%20side')).status).toBe(400)
      expect((await get({}, '..%2Fwebside')).status).toBe(400)
    })
  })
})
