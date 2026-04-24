import { beforeEach, describe, expect, it, vi } from 'vitest'

// Stub Nuxt auto-imports before importing the module under test.
vi.stubGlobal('useRuntimeConfig', () => ({
  apiBaseUrl: 'http://backend/api/v1',
}))

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

const { getTenantConfig, clearTenantCache } = await import(
  '../../../../server/utils/tenant'
)

describe('getTenantConfig', () => {
  beforeEach(() => {
    clearTenantCache()
    fetchMock.mockReset()
  })

  it('strips port from the host before resolving', async () => {
    fetchMock.mockResolvedValueOnce({ schemaName: 'webside' })

    const config = await getTenantConfig('webside.gr:3000')

    expect(config).toEqual({ schemaName: 'webside' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend/api/v1/tenant/resolve',
      { query: { domain: 'webside.gr' } },
    )
  })

  it('caches the response for repeated lookups of the same domain', async () => {
    fetchMock.mockResolvedValueOnce({ schemaName: 'webside' })

    await getTenantConfig('webside.gr')
    await getTenantConfig('webside.gr')
    await getTenantConfig('webside.gr')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('differentiates cache entries per domain', async () => {
    fetchMock.mockResolvedValueOnce({ schemaName: 'webside' })
    fetchMock.mockResolvedValueOnce({ schemaName: 'tenant_b' })

    const a = await getTenantConfig('webside.gr')
    const b = await getTenantConfig('tenant-b.com')

    expect(a).toEqual({ schemaName: 'webside' })
    expect(b).toEqual({ schemaName: 'tenant_b' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null when the backend returns a 404', async () => {
    fetchMock.mockRejectedValueOnce(new Error('404'))

    const config = await getTenantConfig('nowhere.example')

    expect(config).toBeNull()
  })

  it('does not cache negative results', async () => {
    // A misconfigured DNS record should not permanently poison the
    // cache — once the Tenant row is created in Django, the very next
    // request on the same host must resolve successfully.
    fetchMock.mockRejectedValueOnce(new Error('404'))
    fetchMock.mockResolvedValueOnce({ schemaName: 'tenant_b' })

    const first = await getTenantConfig('tenant-b.com')
    const second = await getTenantConfig('tenant-b.com')

    expect(first).toBeNull()
    expect(second).toEqual({ schemaName: 'tenant_b' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clearTenantCache removes a specific host', async () => {
    fetchMock.mockResolvedValueOnce({ schemaName: 'webside' })
    await getTenantConfig('webside.gr')

    clearTenantCache('webside.gr')

    fetchMock.mockResolvedValueOnce({ schemaName: 'webside_v2' })
    const refreshed = await getTenantConfig('webside.gr')

    expect(refreshed).toEqual({ schemaName: 'webside_v2' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
