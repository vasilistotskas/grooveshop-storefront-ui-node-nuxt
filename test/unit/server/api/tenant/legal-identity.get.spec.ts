import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/tenant/legal-identity.get'
import { zApiV1TenantLegalIdentityRetrieveResponse } from '~~/shared/openapi/zod.gen'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse, log } from '~~/test/helpers/nitro'

/**
 * GET /api/tenant/legal-identity: the seller identity every page's footer
 * publishes (e-Commerce Directive art. 5(1), N. 4919/2022 art. 22). For
 * THIS payload a tenant leak means publishing another company's VAT
 * number and registered seat as the seller, so the two isolation
 * properties are asserted on real requests: the backend call carries the
 * store's own host, and the cache key is the store's own.
 */

const route = '/api/tenant/legal-identity'

/** A `MerchantLegalIdentity` as Django serialises it (proved against the schema below). */
const identity = {
  name: 'Webside IKE',
  legalForm: 'IKE',
  vatId: 'EL123456789',
  taxOffice: 'Thessaloniki A',
  registrationNumber: '123456789000',
  businessActivity: 'Retail',
  addressLine1: 'Egnatias 12',
  addressLine2: '',
  city: 'Thessaloniki',
  postalCode: '546 22',
  country: 'GR',
  phone: '+302310000000',
  email: 'info@webside.test',
  inLiquidation: false,
  missingFields: [],
  isComplete: true,
}

describe('GET /api/tenant/legal-identity', () => {
  it('uses a fixture the generated schema accepts', () => {
    expect(zApiV1TenantLegalIdentityRetrieveResponse.parse(identity)).toEqual(identity)
  })

  it('asks the backend for the requesting store, never a spoofed forwarded host', async () => {
    backend.reply(identity)

    const response = await callRoute(handler, {
      route,
      host: 'webside.gr',
      headers: { 'x-forwarded-host': 'evil.example' },
      context: { locale: 'en' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(identity)
    const sent = backend.lastRequest
    expect(sent.path).toBe('http://backend.test/api/v1/tenant/legal-identity')
    expect(sent.method).toBe('GET')
    expect(sent.headers.get('x-forwarded-host')).toBe('webside.gr')
    expect(sent.headers.get('x-language')).toBe('en')
  })

  it('answers 422 and logs the drift when the payload breaks the contract', async () => {
    const { vatId: _dropped, ...withoutVat } = identity
    backend.reply(withoutVat)

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(422)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response' }))
  })

  it('passes an upstream error status through without its body', async () => {
    backend.reply(jsonResponse({ detail: 'internal diagnostics' }, 503))

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(503)
    expect(response.body.data).toBeUndefined()
  })

  it('keys the cache per store and per language', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (host: string, locale: string) => getKey!(createTestEvent({ url: route, host, context: { locale } }))

    const webside = await keyFor('webside.gr', 'el')

    expect(webside.startsWith('webside.gr__el__tenant:legal-identity')).toBe(true)
    expect(await keyFor('other.gr', 'el')).not.toBe(webside)
    expect(await keyFor('webside.gr', 'en')).not.toBe(webside)
  })
})
