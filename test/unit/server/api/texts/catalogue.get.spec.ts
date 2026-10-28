import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/texts/catalogue.get'
import { callRoute } from '~~/test/helpers/nitro'

const get = (headers: Record<string, string> = {}) => callRoute(handler, { route: '/api/texts/catalogue', headers })

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
})
