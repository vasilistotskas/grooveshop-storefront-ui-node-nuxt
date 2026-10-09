import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTenantCache, getTenantConfig, isPlatformTenantConfig } from '~~/server/utils/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, jsonResponse, log, setRuntimeConfig } from '~~/test/helpers/nitro'

/**
 * `getTenantConfig` runs on every request (server/middleware/0.tenant.ts),
 * so the resolve payload goes through the REAL `zTenantConfig` here: a
 * fixture that stopped matching the schema would read as "Store not
 * found" in production and must fail this spec first.
 */
const WEBSIDE = validTenantConfig('webside.gr', { schemaName: 'webside' })

/** Answer every resolve with `status` until `failures` requests have failed, then with `body`. */
function failThen(failures: number, status: number, body: unknown) {
  let seen = 0
  backend.reply(() => (seen++ < failures ? jsonResponse({ detail: 'x' }, status) : body))
}

beforeEach(() => {
  clearTenantCache()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getTenantConfig', () => {
  it('resolves the host through Django, port stripped, and returns the validated config', async () => {
    backend.reply(WEBSIDE)

    const result = await getTenantConfig('webside.gr:3000')

    expect(result).toEqual({ type: 'ok', config: expect.objectContaining({ schemaName: 'webside', primaryDomain: 'webside.gr' }) })
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/tenant/resolve')
    expect(backend.lastRequest.query).toEqual({ domain: 'webside.gr' })
  })

  it('resolves a Host in any case to the store: hostnames are case-insensitive', async () => {
    // Django matches TenantDomain exactly, so `Webside.GR` was "Store not
    // found" for a host that is the store's.
    backend.reply(WEBSIDE)

    await getTenantConfig('Webside.GR:443')

    expect(backend.lastRequest.query).toEqual({ domain: 'webside.gr' })
  })

  it('asks Django once per domain while the entry is fresh, and separately per domain', async () => {
    backend.reply(({ query }) => validTenantConfig(query.domain!))

    await getTenantConfig('webside.gr')
    await getTenantConfig('webside.gr:443')
    const other = await getTenantConfig('tenant-b.test')

    expect(backend.requests.map(request => request.query.domain)).toEqual(['webside.gr', 'tenant-b.test'])
    expect(other.config?.primaryDomain).toBe('tenant-b.test')
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('asks again once the 5-minute entry has expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    backend.reply(WEBSIDE)

    await getTenantConfig('webside.gr')
    vi.advanceTimersByTime(5 * 60 * 1000 - 1)
    await getTenantConfig('webside.gr')
    expect(backend.requests).toHaveLength(1)

    vi.advanceTimersByTime(1)
    await getTenantConfig('webside.gr')
    expect(backend.requests).toHaveLength(2)
  })

  it('evicts the oldest entry once 1000 domains are cached', async () => {
    backend.reply(({ query }) => validTenantConfig(query.domain!))
    for (let i = 0; i < 1000; i++) await getTenantConfig(`store-${i}.test`)

    await getTenantConfig('store-1000.test')
    await getTenantConfig('store-1.test')
    await getTenantConfig('store-0.test')

    // 1 was still cached; 0 was the oldest and made room for 1000.
    expect(backend.requests.slice(1000).map(request => request.query.domain)).toEqual(['store-1000.test', 'store-0.test'])
  })

  it('refuses an unknown host as not_found, warning once with the host', async () => {
    // Django answers this from the public schema, so its own log has no
    // Host — this warning is the only place the host is recorded.
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const result = await getTenantConfig('not-a-store.test:3000')

    expect(result).toEqual({ type: 'not_found', config: null })
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ tag: 'tenant', domain: 'not-a-store.test' }))
    expect(log.error).not.toHaveBeenCalled()
  })

  it('does not cache a refusal, so a newly provisioned store resolves on the next request', async () => {
    failThen(1, 404, validTenantConfig('brand-new.test'))

    expect((await getTenantConfig('brand-new.test')).type).toBe('not_found')
    const second = await getTenantConfig('brand-new.test')

    expect(second.config?.primaryDomain).toBe('brand-new.test')
    expect(backend.requests).toHaveLength(2)
  })

  it.each([500, 503])('reports a %i as transient (error_5xx), with the status, and does not cache it', async (status) => {
    // ofetch retries a GET once on a 5xx, so the first lookup spends two requests.
    failThen(2, status, WEBSIDE)

    const first = await getTenantConfig('webside.gr')
    const second = await getTenantConfig('webside.gr')

    expect(first).toEqual({ type: 'error_5xx', config: null })
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ domain: 'webside.gr', status }))
    expect(second.config?.primaryDomain).toBe('webside.gr')
    expect(backend.requests).toHaveLength(3)
  })

  it('reports a network-level failure (no HTTP status) as transient, not as a missing store', async () => {
    // A connect timeout used to fall through to not_found, so the shop
    // looked deleted for the duration of a Django restart (2026-08-21).
    backend.reply(() => {
      throw new TypeError('fetch failed')
    })

    const result = await getTenantConfig('webside.gr')

    expect(result).toEqual({ type: 'error_5xx', config: null })
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ status: 'network-error' }))
  })

  it('treats a payload that fails zTenantConfig as not_found, uncached, and warns', async () => {
    const { schemaName: _dropped, ...incomplete } = WEBSIDE
    failThen(0, 200, incomplete)

    const result = await getTenantConfig('webside.gr')
    await getTenantConfig('webside.gr')

    expect(result).toEqual({ type: 'not_found', config: null })
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ tag: 'tenant', message: expect.stringContaining('Zod validation') }))
    expect(backend.requests).toHaveLength(2)
  })

  it('clearTenantCache(host) drops only that host, port-insensitively', async () => {
    backend.reply(({ query }) => validTenantConfig(query.domain!))
    await getTenantConfig('webside.gr')
    await getTenantConfig('tenant-b.test')

    clearTenantCache('webside.gr:3000')
    await getTenantConfig('webside.gr')
    await getTenantConfig('tenant-b.test')

    expect(backend.requests.map(request => request.query.domain)).toEqual(['webside.gr', 'tenant-b.test', 'webside.gr'])
  })

  it('clearTenantCache() drops every host', async () => {
    backend.reply(({ query }) => validTenantConfig(query.domain!))
    await getTenantConfig('webside.gr')
    await getTenantConfig('tenant-b.test')

    clearTenantCache()
    await getTenantConfig('webside.gr')
    await getTenantConfig('tenant-b.test')

    expect(backend.requests).toHaveLength(4)
  })
})

describe('isPlatformTenantConfig', () => {
  it('is true only for the tenant carrying the isPlatformStorefront row flag', () => {
    expect(isPlatformTenantConfig({ primaryDomain: 'store-one.test', isPlatformStorefront: true })).toBe(true)
    expect(isPlatformTenantConfig({ primaryDomain: 'store-two.test', isPlatformStorefront: false })).toBe(false)
  })

  it('fails CLOSED when the payload predates the flag: no store is the platform by default', () => {
    expect(isPlatformTenantConfig({ primaryDomain: 'store-one.test' })).toBe(false)
  })

  it('counts an absent tenant or unset primaryDomain as platform (probes, prerender)', () => {
    expect(isPlatformTenantConfig(undefined)).toBe(true)
    expect(isPlatformTenantConfig(null)).toBe(true)
    expect(isPlatformTenantConfig({ primaryDomain: '' })).toBe(true)
  })

  it('never compares hostnames against runtime config', () => {
    setRuntimeConfig({ public: { baseUrl: 'https://store-one.test' } })

    expect(isPlatformTenantConfig({ primaryDomain: 'store-one.test' })).toBe(false)
  })
})
