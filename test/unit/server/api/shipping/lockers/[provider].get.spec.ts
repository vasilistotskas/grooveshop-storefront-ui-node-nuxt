import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/lockers/[provider].get'
import { zAcsStation } from '~~/shared/openapi/zod.gen'
import type { BackendRequest } from '~~/test/helpers/nitro'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'

/**
 * GET /api/shipping/lockers/[provider]: the checkout map's whole locker
 * catalogue for one carrier, normalised and fetched page by page. An
 * EMPTY catalogue is refused with a 503 so the hour-long cache never
 * stores a blank map.
 */

const route = '/api/shipping/lockers/:provider'

function station(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    uuid: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    externalId: `ACS-${id}`,
    branchCode: '',
    shopKind: 1,
    name: `Locker ${id}`,
    addressLine1: 'Egnatias 1',
    city: 'Thessaloniki',
    postalCode: '54622',
    countryCode: 'GR',
    lat: '40.6401',
    lng: '22.9444',
    maxWeightKg: '20.5',
    workingHours: '',
    isActive: true,
    lastSyncedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const page = (results: unknown[], pageNumber = 1, totalPages = 1) =>
  ({ count: results.length, page: pageNumber, totalPages, results })

describe('GET /api/shipping/lockers/[provider]', () => {
  it('uses a station fixture the generated schema accepts', () => {
    expect(zAcsStation.safeParse(station(1)).success).toBe(true)
  })

  it('normalises each ACS station for the map', async () => {
    backend.reply(page([
      station(1, { lat: null, lng: '', branchCode: 'TH01', workingHours: 'Mon-Fri' }),
      station(2, { branchCode: '', workingHours: '' }),
    ]))

    const response = await callRoute(handler, { route, url: '/api/shipping/lockers/acs' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([{
      externalId: 'ACS-1',
      branchCode: 'TH01',
      shopKind: 1,
      name: 'Locker 1',
      addressLine1: 'Egnatias 1',
      city: 'Thessaloniki',
      postalCode: '54622',
      countryCode: 'GR',
      lat: null,
      lng: null,
      workingHours: 'Mon-Fri',
      maxWeightKg: 20.5,
    }, expect.objectContaining({ externalId: 'ACS-2', branchCode: null, workingHours: null, lat: 40.6401, lng: 22.9444 })])
  })

  it('reads every page, 100 stations at a time, for the upper-cased country', async () => {
    backend.reply((request: BackendRequest) => request.query.page === '1'
      ? page([station(1)], 1, 2)
      : page([station(2)], 2, 2))

    const response = await callRoute(handler, { route, url: '/api/shipping/lockers/ACS?country=gr', headers: { 'x-forwarded-host': 'evil.example' } })

    expect(response.body.map((locker: { externalId: string }) => locker.externalId)).toEqual(['ACS-1', 'ACS-2'])
    expect(backend.requests.map(request => request.query)).toEqual([
      { page: '1', pageSize: '100', countryCode: 'GR' },
      { page: '2', pageSize: '100', countryCode: 'GR' },
    ])
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/shipping/acs/stations')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('stops after ten pages however many Django claims', async () => {
    backend.reply((request: BackendRequest) => page([station(Number(request.query.page))], Number(request.query.page), 999))

    const response = await callRoute(handler, { route, url: '/api/shipping/lockers/acs' })

    expect(response.body).toHaveLength(10)
    expect(backend.requests).toHaveLength(10)
  })

  it('refuses to answer (and so to cache) an empty catalogue', async () => {
    backend.reply(page([]))

    const response = await callRoute(handler, { route, url: '/api/shipping/lockers/acs' })

    expect(response.status).toBe(503)
  })

  it('answers 404 for a carrier with no bulk catalogue', async () => {
    const response = await callRoute(handler, { route, url: '/api/shipping/lockers/boxnow' })

    expect(response.status).toBe(404)
    expect(backend.requests).toEqual([])
  })

  it('rejects a country that is not a two-letter code', async () => {
    const response = await callRoute(handler, { route, url: '/api/shipping/lockers/acs?country=GRC' })

    expect(response.status).toBe(400)
  })

  describe('cache', () => {
    const options = cacheOptionsOf(handler)
    const event = (url: string) => createTestEvent({ url, context: { params: { provider: 'acs' } } })

    it('keys the entry on the carrier and the country, whatever its case', async () => {
      const gr = await options.getKey!(event('/api/shipping/lockers/acs?country=gr'))

      expect(gr).toBe(await options.getKey!(event('/api/shipping/lockers/acs?country=GR')))
      expect(gr).not.toBe(await options.getKey!(event('/api/shipping/lockers/acs?country=CY')))
      expect(gr).toMatch(/^shop\.test__el__acs:GR_/)
    })

    it('lets ops force a fresh catalogue with ?refresh=1', async () => {
      expect(await options.shouldBypassCache!(event('/api/shipping/lockers/acs?refresh=1'))).toBe(true)
      expect(await options.shouldBypassCache!(event('/api/shipping/lockers/acs'))).toBe(false)
    })
  })
})
