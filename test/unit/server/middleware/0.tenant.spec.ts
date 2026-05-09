/**
 * Unit tests for server/middleware/0.tenant.ts
 *
 * Tests bypass paths, 5xx → 503 propagation, 404 → 404 propagation,
 * and tenant context assignment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Stubs required before the module under test is imported ----

// createError is auto-imported from h3
vi.stubGlobal('createError', (opts: Record<string, unknown>) => {
  const err = new Error(String(opts.statusMessage ?? 'Error')) as Error & { statusCode?: number, statusMessage?: string }
  err.statusCode = opts.statusCode as number
  err.statusMessage = opts.statusMessage as string
  return err
})

// getRequestHeader used to detect prerender
vi.stubGlobal('getRequestHeader', vi.fn().mockReturnValue(undefined))

// getRequestHost used for tenant resolution
const hostMock = vi.fn().mockReturnValue('webside.gr')
vi.stubGlobal('getRequestHost', hostMock)

// getTenantConfig — module under test calls this
const getTenantConfigMock = vi.fn()
vi.stubGlobal('getTenantConfig', getTenantConfigMock)

// defineEventHandler — execute the handler directly
vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)

// ---- Import module under test ----
const module = await import('../../../../server/middleware/0.tenant')
const handler = (module.default ?? module) as unknown as (event: unknown) => Promise<void>

// ---- Helpers ----
function makeEvent(path: string): { path: string, context: Record<string, unknown> } {
  return { path, context: {} }
}

describe('0.tenant middleware', () => {
  beforeEach(() => {
    getTenantConfigMock.mockReset()
    hostMock.mockReturnValue('webside.gr')
    vi.mocked(getRequestHeader).mockReturnValue(undefined)
  })

  // --- Bypass paths: prefix-based ---
  describe.each([
    ['/_nuxt/builds/meta/XXX.json', '/_nuxt chunk (HMR asset)'],
    ['/_ipx/w_200/logo.png', '/_ipx image processing'],
    ['/assets/main.css', '/assets static file'],
    ['/api/health', 'k8s liveness probe path'],
    ['/api/health/live', 'nested k8s health probe'],
  ])('prefix bypass: %s (%s)', (path) => {
    it('returns early without calling getTenantConfig', async () => {
      const event = makeEvent(path)
      const result = await handler(event)
      expect(result).toBeUndefined()
      expect(getTenantConfigMock).not.toHaveBeenCalled()
      expect(event.context.tenant).toBeUndefined()
    })
  })

  // --- Bypass paths: exact ---
  describe.each([
    ['/health', 'root health endpoint'],
    ['/favicon.ico', 'favicon.ico'],
    ['/favicon.png', 'favicon.png'],
    ['/logo.svg', 'logo svg'],
    ['/robots.txt', 'robots.txt'],
    ['/manifest.webmanifest', 'PWA manifest'],
    ['/openapi', 'OpenAPI endpoint'],
    ['/_health', 'Nitro health convention'],
  ])('exact bypass: %s (%s)', (path) => {
    it('returns early without calling getTenantConfig', async () => {
      const event = makeEvent(path)
      const result = await handler(event)
      expect(result).toBeUndefined()
      expect(getTenantConfigMock).not.toHaveBeenCalled()
    })
  })

  // --- Prerender bypass ---
  it('skips tenant resolution during build-time prerendering', async () => {
    vi.mocked(getRequestHeader).mockReturnValue('1')
    const event = makeEvent('/products')
    const result = await handler(event)
    expect(result).toBeUndefined()
    expect(getTenantConfigMock).not.toHaveBeenCalled()
  })

  // --- Successful resolution ---
  it('sets event.context.tenant on successful resolution', async () => {
    const tenant = { schemaName: 'webside', storeName: 'Webside' }
    getTenantConfigMock.mockResolvedValueOnce({ type: 'ok', config: tenant })
    const event = makeEvent('/')
    await handler(event)
    expect(event.context.tenant).toBe(tenant)
  })

  // --- 404 (unknown domain) ---
  it('throws 404 when tenant is not found', async () => {
    getTenantConfigMock.mockResolvedValueOnce({ type: 'not_found', config: null })
    const event = makeEvent('/')
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  // --- 5xx (backend down) → 503 ---
  it('throws 503 (not 404) when backend returns a 5xx error', async () => {
    getTenantConfigMock.mockResolvedValueOnce({ type: 'error_5xx', config: null })
    const event = makeEvent('/')
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 503 })
  })
})
