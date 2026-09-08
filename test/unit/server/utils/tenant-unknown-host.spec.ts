/**
 * An unknown Host must say so, once, with the host in it.
 *
 * `getTenantConfig` returned `{ type: 'not_found' }` silently. Django
 * answers that lookup from the PUBLIC schema — no tenant resolved — so its
 * own request log reads `schema=public domain=-` and the Host appears
 * nowhere. The 2026-09-08 audit counted ~300 of these a day on production
 * and there was no way to tell the two causes apart: a bot sending an
 * arbitrary Host, or a real store whose `TenantDomain` row was never added.
 *
 * Negative results are deliberately never cached (an adversarial Host must
 * not be able to fill the cache, and a newly-added Tenant row must resolve
 * on the very next request), so every probe re-asks and every probe logs.
 * That makes `warn` the right level: refusing an unknown host is this
 * function working.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockLog = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
const fetchMock = vi.fn()

vi.stubGlobal('log', mockLog)
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://backend-service:80/api/v1' }))
vi.stubGlobal('parseDataAs', async (data: unknown) => data)
vi.stubGlobal('zTenantConfig', {})

const { getTenantConfig, clearTenantCache } = await import('../../../../server/utils/tenant')

/** ofetch shape: an HTTP failure carries `.status`, a network blip does not. */
function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status })
}

describe('getTenantConfig on an unknown host', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearTenantCache()
  })

  it('warns with the host that failed to resolve', async () => {
    fetchMock.mockRejectedValue(httpError(404))

    const result = await getTenantConfig('not-a-store.example')

    expect(result).toEqual({ type: 'not_found', config: null })
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'tenant', domain: 'not-a-store.example' }),
    )
    expect(mockLog.error).not.toHaveBeenCalled()
  })

  it('strips the port, matching how TenantDomain stores hosts', async () => {
    fetchMock.mockRejectedValue(httpError(404))

    await getTenantConfig('localhost:3000')

    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'localhost' }),
    )
  })

  it('keeps a transient failure distinguishable from an unknown host', async () => {
    // A 5xx or a network blip must NOT read as "this domain is not a store":
    // answering a hard 404 made the shop look deleted for the duration of a
    // Django restart (production, 2026-08-21).
    fetchMock.mockRejectedValue(httpError(503))

    const result = await getTenantConfig('webside.gr')

    expect(result).toEqual({ type: 'error_5xx', config: null })
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 503 }),
    )
  })

  it('does not cache the refusal, so a new store resolves immediately', async () => {
    fetchMock.mockRejectedValueOnce(httpError(404))
    await getTenantConfig('brand-new.example')

    fetchMock.mockResolvedValueOnce({ primaryDomain: 'brand-new.example' })
    const second = await getTenantConfig('brand-new.example')

    expect(second.type).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('says nothing extra once a host is cached', async () => {
    fetchMock.mockResolvedValue({ primaryDomain: 'webside.gr' })

    await getTenantConfig('webside.gr')
    await getTenantConfig('webside.gr')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockLog.warn).not.toHaveBeenCalled()
  })
})
