import { beforeEach, describe, expect, it, vi } from 'vitest'

// Stub Nuxt auto-imports before importing the module under test.
vi.stubGlobal('useRuntimeConfig', () => ({
  apiBaseUrl: 'http://backend/api/v1',
}))

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

// parseDataAs — default pass-through; some tests override per-call via the mock.
// In unit test node env (no Nitro auto-import transforms running), tenant.ts
// reads parseDataAs from globalThis. vi.stubGlobal installs it there.
const parseDataAsMock = vi.fn(async (data: unknown) => data)
vi.stubGlobal('parseDataAs', parseDataAsMock)

// zTenantConfig is passed as the schema arg to parseDataAs in tenant.ts.
// Stub it so the reference resolves (our parseDataAs mock ignores the schema).
vi.stubGlobal('zTenantConfig', { _isZodSchema: true })

// log is auto-imported on server — provide a no-op stub.
vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })

// Minimal valid TenantConfig fixture used across tests
const VALID_TENANT: Record<string, unknown> = {
  schemaName: 'webside',
  name: 'Webside',
  storeName: 'Webside Store',
  storeDescription: 'A test store',
  logoLightUrl: 'https://example.com/logo-light.png',
  logoDarkUrl: 'https://example.com/logo-dark.png',
  faviconUrl: 'https://example.com/favicon.png',
  primaryColor: 'neutral',
  neutralColor: 'zinc',
  accentHex: '#003DFF',
  successHex: '#22c55e',
  warningHex: '#f59e0b',
  errorHex: '#ef4444',
  infoHex: '#3b82f6',
  themePreset: 'default',
  themeMetadata: null,
  defaultLocale: 'el',
  defaultCurrency: 'EUR',
  primaryDomain: 'webside.gr',
  loyaltyEnabled: false,
  blogEnabled: true,
  plan: 'trial',
}

const TENANT_B_CONFIG = { ...VALID_TENANT, schemaName: 'tenant_b', storeName: 'Tenant B Store', primaryDomain: 'tenant-b.com' }

const { getTenantConfig, clearTenantCache } = await import(
  '../../../../server/utils/tenant'
)

describe('getTenantConfig', () => {
  beforeEach(() => {
    clearTenantCache()
    fetchMock.mockReset()
    parseDataAsMock.mockReset()
    parseDataAsMock.mockImplementation(async (data: unknown) => data)
    vi.mocked(log.warn).mockReset()
  })

  it('strips port from the host before resolving', async () => {
    fetchMock.mockResolvedValueOnce(VALID_TENANT)

    const result = await getTenantConfig('webside.gr:3000')

    expect(result.type).toBe('ok')
    expect(result.config).toMatchObject({ schemaName: 'webside' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend/api/v1/tenant/resolve',
      { query: { domain: 'webside.gr' } },
    )
  })

  it('caches the response for repeated lookups of the same domain', async () => {
    fetchMock.mockResolvedValueOnce(VALID_TENANT)

    await getTenantConfig('webside.gr')
    await getTenantConfig('webside.gr')
    await getTenantConfig('webside.gr')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('differentiates cache entries per domain', async () => {
    fetchMock.mockResolvedValueOnce(VALID_TENANT)
    fetchMock.mockResolvedValueOnce(TENANT_B_CONFIG)

    const a = await getTenantConfig('webside.gr')
    const b = await getTenantConfig('tenant-b.com')

    expect(a.type).toBe('ok')
    expect(a.config).toMatchObject({ schemaName: 'webside' })
    expect(b.type).toBe('ok')
    expect(b.config).toMatchObject({ schemaName: 'tenant_b' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns not_found when the backend returns a 404', async () => {
    const err = Object.assign(new Error('Not Found'), { status: 404 })
    fetchMock.mockRejectedValueOnce(err)

    const result = await getTenantConfig('nowhere.example')

    expect(result.type).toBe('not_found')
    expect(result.config).toBeNull()
  })

  it('returns error_5xx when the backend returns a 500', async () => {
    const err = Object.assign(new Error('Internal Server Error'), { status: 500 })
    fetchMock.mockRejectedValueOnce(err)

    const result = await getTenantConfig('webside.gr')

    expect(result.type).toBe('error_5xx')
    expect(result.config).toBeNull()
  })

  it('returns error_5xx when the backend returns a 503', async () => {
    const err = Object.assign(new Error('Service Unavailable'), { status: 503 })
    fetchMock.mockRejectedValueOnce(err)

    const result = await getTenantConfig('webside.gr')

    expect(result.type).toBe('error_5xx')
    expect(result.config).toBeNull()
  })

  it('does not cache 5xx responses (next request retries)', async () => {
    const serverErr = Object.assign(new Error('Internal Server Error'), { status: 500 })
    fetchMock.mockRejectedValueOnce(serverErr)
    fetchMock.mockResolvedValueOnce(VALID_TENANT)

    const first = await getTenantConfig('webside.gr')
    const second = await getTenantConfig('webside.gr')

    expect(first.type).toBe('error_5xx')
    expect(second.type).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache not_found responses (domain may be provisioned later)', async () => {
    const notFoundErr = Object.assign(new Error('Not Found'), { status: 404 })
    fetchMock.mockRejectedValueOnce(notFoundErr)
    fetchMock.mockResolvedValueOnce(TENANT_B_CONFIG)

    const first = await getTenantConfig('tenant-b.com')
    const second = await getTenantConfig('tenant-b.com')

    expect(first.type).toBe('not_found')
    expect(second.type).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('treats malformed response (parseDataAs failure) as not_found and warns', async () => {
    fetchMock.mockResolvedValueOnce({ invalid: 'payload' })
    parseDataAsMock.mockRejectedValueOnce(new Error('Zod parse failed'))

    const result = await getTenantConfig('bad-payload.example')

    expect(result.type).toBe('not_found')
    expect(log.warn).toHaveBeenCalledWith(
      'tenant',
      expect.stringContaining('Zod validation'),
      expect.any(Object),
    )
  })

  it('clearTenantCache removes a specific host', async () => {
    fetchMock.mockResolvedValueOnce(VALID_TENANT)
    await getTenantConfig('webside.gr')

    clearTenantCache('webside.gr')

    const updated = { ...VALID_TENANT, storeName: 'Webside v2' }
    fetchMock.mockResolvedValueOnce(updated)
    const refreshed = await getTenantConfig('webside.gr')

    expect(refreshed.type).toBe('ok')
    expect(refreshed.config).toMatchObject({ storeName: 'Webside v2' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
