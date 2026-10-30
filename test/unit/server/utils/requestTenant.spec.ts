import { beforeEach, describe, expect, it } from 'vitest'
import { requestTenantResult } from '~~/server/utils/requestTenant'
import { clearTenantCache } from '~~/server/utils/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

/**
 * A request looks its store up ONCE, however many middleware, plugins and
 * routes ask. The lookup is real: the backend's resolve endpoint is what
 * answers, and `backend.requests` counts the round trips to Django.
 */
const resolves = () => backend.requests.filter(request => request.path.endsWith('/tenant/resolve'))

beforeEach(() => {
  clearTenantCache()
})

describe('requestTenantResult', () => {
  it('asks Django once for a host that is not a store, however many callers ask', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))
    const event = createTestEvent({ host: 'unknown.test' })

    const results = await Promise.all([requestTenantResult(event), requestTenantResult(event)])
    results.push(await requestTenantResult(event))

    expect(results.map(result => result.type)).toEqual(['not_found', 'not_found', 'not_found'])
    expect(resolves()).toHaveLength(1)
  })

  it('remembers a backend failure for the rest of the request', async () => {
    backend.reply(jsonResponse({ detail: 'down' }, 503))
    const event = createTestEvent({ host: 'shop.test' })

    expect((await requestTenantResult(event)).type).toBe('error_5xx')
    // The fetcher may retry a 5xx inside the one lookup; a second caller adds nothing.
    const asked = resolves().length
    expect((await requestTenantResult(event)).type).toBe('error_5xx')
    expect(resolves()).toHaveLength(asked)
  })

  it('never carries a not-found over to the next request: a store created a moment ago resolves at once', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))
    expect((await requestTenantResult(createTestEvent({ host: 'new.test' }))).type).toBe('not_found')

    backend.reply(validTenantConfig('new.test'))
    expect((await requestTenantResult(createTestEvent({ host: 'new.test' }))).type).toBe('ok')
  })

  it('asks Django once per cache window for a known store, across requests', async () => {
    backend.reply(validTenantConfig('shop.test'))

    const first = await requestTenantResult(createTestEvent({ host: 'Shop.Test:443' }))
    await requestTenantResult(createTestEvent({ host: 'shop.test' }))

    expect(first.type).toBe('ok')
    expect(resolves()).toHaveLength(1)
  })

  it('names the store from the Host when the tenant middleware has not run yet', async () => {
    backend.reply(({ query }) => validTenantConfig(query.domain!))
    const event = createTestEvent({ host: 'Early.Test:8443' })

    await requestTenantResult(event)

    expect(event.context.tenantHost).toBe('early.test')
    expect(resolves().map(request => request.query.domain)).toEqual(['early.test'])
  })

  it('takes the store the middleware already resolved, without asking', async () => {
    const tenant = validTenantConfig('shop.test')

    const result = await requestTenantResult(createTestEvent({ host: 'shop.test', context: { tenant } }))

    expect(result).toEqual({ type: 'ok', config: tenant })
    expect(backend.requests).toEqual([])
  })
})
