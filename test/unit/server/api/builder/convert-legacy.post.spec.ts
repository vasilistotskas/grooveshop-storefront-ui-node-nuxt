import { beforeEach, describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/convert-legacy.post'
import { callRoute, setRuntimeConfig } from '~~/test/helpers/nitro'

const TOKEN = 'internal-token-for-tests'
const route = '/api/builder/convert-legacy'
const ID = '00000000-0000-4000-8000-000000000001'

const section = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  type: 'promo_banner',
  title: 'Sale',
  isVisible: true,
  props: { tone: 'accent', product_id: 7 },
  ...overrides,
})
const request = (sections: unknown[] = [section()]) => ({
  schema: 'demo',
  kind: 'template',
  key: 'template:home',
  defaultLocale: 'el',
  legacy: { pageType: 'home', title: 'Home', seo: {}, sections },
})
const post = (body: unknown, token: string | null = TOKEN) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers: token === null ? {} : { 'x-cache-purge-token': token },
})

beforeEach(() => {
  setRuntimeConfig({ cachePurgeToken: TOKEN })
})

describe('POST /api/builder/convert-legacy', () => {
  it('answers a legacy layout with its document, overlay and warnings', async () => {
    const response = await post(request([section({ i18n: { en: { title: 'Sale EN', props: { tone: 'info' } } } })]))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.body).toEqual({
      document: {
        sections: { [ID]: { type: 'promo_banner@2', settings: { title: 'Sale', tone: 'accent', productId: 7 } } },
        order: [ID],
      },
      i18n: { en: { [ID]: { '/title': 'Sale EN' } } },
      warnings: [{ code: 'dropped_override', path: `/sections/${ID}/tone`, message: 'the en translation of "tone" is not translatable; it was dropped' }],
    })
  })

  it('is the same for any caller: no store host is needed', async () => {
    const one = await callRoute(handler, { route, method: 'POST', body: request(), host: 'one.test', headers: { 'x-cache-purge-token': TOKEN } })
    const other = await callRoute(handler, { route, method: 'POST', body: request(), host: 'other.test', headers: { 'x-cache-purge-token': TOKEN } })

    expect(other.body).toEqual(one.body)
  })

  describe('who may call it', () => {
    it.each([
      ['no token', null],
      ['a wrong token', 'not-the-token'],
    ])('answers 401 with %s', async (_, token) => {
      expect((await post(request(), token)).status).toBe(401)
    })

    it('answers 401 for every caller when no secret is configured, even with an empty token', async () => {
      setRuntimeConfig({ cachePurgeToken: '' })

      expect((await post(request(), '')).status).toBe(401)
      expect((await post(request(), TOKEN)).status).toBe(401)
    })
  })

  it('answers 422 with every reason when a section cannot be converted, and converts nothing', async () => {
    const response = await post(request([
      section(),
      section({ id: 'second', type: 'page_hero' }),
      section({ id: 'third', props: { tone: 'purple' } }),
    ]))

    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      code: 'unconvertible',
      errors: [
        { path: '/sections/second', code: 'unknown_block_type', message: expect.stringContaining('page_hero') },
        { path: '/sections/third/settings', code: 'invalid_settings', message: expect.stringContaining('tone') },
      ],
    })
  })

  it.each([
    ['a kind it does not convert', { ...request(), kind: 'theme' }],
    ['no default language', { ...request(), defaultLocale: undefined }],
    ['a section id that is not an id', request([section({ id: 'has space' })])],
    ['no layout', { ...request(), legacy: undefined }],
  ])('answers 400 for %s', async (_, body) => {
    expect((await post(body)).status).toBe(400)
  })
})
