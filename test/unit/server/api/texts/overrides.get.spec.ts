import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/texts/overrides.get'
import { cacheKeyBelongsToHost } from '~~/server/utils/cacheKey'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/texts/overrides'
const FOOTER = 'components/Chrome/Footer'

const get = (url = `${route}?language=el`) => callRoute(handler, {
  route,
  url,
  headers: { 'x-forwarded-host': 'evil.example' },
})

describe('GET /api/texts/overrides', () => {
  it('asks the request\'s store for the language and returns the overrides as Django stores them', async () => {
    const overrides = { [FOOTER]: { 'code_label': 'Κωδικός', 'links.about': 'Ποιοι είμαστε' }, global: { 'a.b': 'x' } }
    backend.reply(overrides)

    const response = await get(`${route}?language=en`)

    expect(response.status).toBe(200)
    // Keys are the storefront's own ids: nothing camelCases them.
    expect(response.body).toEqual(overrides)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/texts/overrides')
    expect(backend.lastRequest.query).toEqual({ language: 'en' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers a store without overrides with an empty object', async () => {
    backend.reply({})

    const response = await get()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({})
  })

  it('refuses a request without a language before calling Django', async () => {
    const response = await get(route)

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('refuses an answer that is not namespace -> key -> text', async () => {
    backend.reply({ [FOOTER]: { code_label: 5 } })

    const response = await get()

    expect(response.status).toBe(422)
  })

  it.each([
    [400, { language: ['Not a served language.'] }],
    [404, { detail: 'Not found.' }],
  ])('returns Django\'s %i body verbatim', async (status, body) => {
    backend.reply(jsonResponse(body, status))

    const response = await get()

    expect(response.status).toBe(status)
    expect(response.body).toEqual(body)
  })

  it('does not hide a Django outage', async () => {
    backend.reply(jsonResponse({ detail: 'down' }, 503))

    expect((await get()).status).toBe(503)
  })

  describe('cache', () => {
    // Django purges `cache:nitro:handlers:textOverrides*` after a save
    // (core/cache/surfaces.py): the name is half of that contract.
    it('is the handler named textOverrides', () => {
      expect(cacheOptionsOf(handler).name).toBe('textOverrides')
    })

    it('keys by store, page locale and the language asked for', async () => {
      const { getKey } = cacheOptionsOf(handler)
      const keyFor = (host: string, locale: string, language: string) =>
        getKey!(createTestEvent({ host, url: `${route}?language=${language}`, context: { locale } }))

      const key = await keyFor('store-a.test', 'el', 'el')

      expect(await keyFor('store-b.test', 'el', 'el')).not.toBe(key)
      expect(await keyFor('store-a.test', 'en', 'el')).not.toBe(key)
      // The language switch fetches the NEW language while the page is still the old one.
      expect(await keyFor('store-a.test', 'el', 'en')).not.toBe(key)
    })

    it('is stored where a tenant-scoped purge finds it', async () => {
      const { getKey } = cacheOptionsOf(handler)
      const key = await getKey!(createTestEvent({ host: 'store-a.test', url: `${route}?language=el`, context: { locale: 'el' } }))
      // Nitro stores `nitro:handlers:<name>:<key without non-word characters>.json`.
      const stored = `nitro:handlers:textOverrides:${key.replace(/\W/g, '')}.json`

      expect(cacheKeyBelongsToHost(stored, 'store-a.test')).toBe(true)
      expect(cacheKeyBelongsToHost(stored, 'store-b.test')).toBe(false)
    })
  })
})
